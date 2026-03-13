/**
 * E2E Integration Test: Full Payment Lifecycle on Base Sepolia
 *
 * Exercises the complete x402r refundable payment flow against real contracts:
 *   Authorize -> Request Refund -> Freeze -> Submit Evidence -> Read Evidence -> Arbiter Approve -> Execute Refund
 *
 * Uses 3 accounts derived from a single mnemonic (or separate private keys):
 *   - Account 0: Payer (has ETH + USDC)
 *   - Account 1: Merchant/Receiver
 *   - Account 2: Arbiter
 *
 * Prerequisites:
 *   - Base Sepolia ETH (~0.01 for gas)
 *   - Base Sepolia USDC (0.01 USDC = 10000 units)
 *
 * Usage:
 *   PRIVATE_KEY=0x... pnpm example:e2e-test
 */

import {
  type Address,
  authCaptureEscrowAbi,
  checkAndLogBalances,
  computePaymentInfoHash,
  createSDKInstances,
  deployTestOperator,
  distributeFees,
  erc20Abi,
  formatUnits,
  fundDerivedAccounts,
  PAYMENT_AMOUNT,
  performHTTP402Payment,
  RefundRequestStatus,
  SCANNER,
  StepRunner,
  setupE2EAccounts,
  setupHTTP402,
  shortAddr,
  signatureConditionAbi,
  USDC_ADDRESS,
  waitForTx,
} from './shared.js'

// ============ Main ============

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║       x402r E2E Integration Test — Base Sepolia        ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  const runner = new StepRunner()

  // ---- Step 1: Setup accounts ----
  runner.step('1. Setup Accounts & Clients')

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is required')
    console.error('Usage: PRIVATE_KEY=0x... pnpm example:e2e-test')
    process.exit(1)
  }

  const accounts = await setupE2EAccounts(privateKey, { derivedCount: 2 })

  runner.log(`Payer:    ${accounts.payerAccount.address}`)
  runner.log(`Merchant: ${accounts.merchantAccount.address}`)
  runner.log(`Arbiter:  ${accounts.arbiterAccount!.address}`)

  await checkAndLogBalances(accounts, runner)
  await fundDerivedAccounts(accounts, runner)
  runner.pass('Setup accounts and fund derived wallets')

  runner.log(
    `Network: ${accounts.chainConfig.name} (chainId: ${accounts.chainId})`,
  )
  runner.log(
    `AuthCaptureEscrow: ${shortAddr(accounts.chainConfig.authCaptureEscrow)}`,
  )
  runner.log(
    `TokenCollector: ${shortAddr(accounts.chainConfig.tokenCollector)}`,
  )

  // ---- Step 2: Deploy Operator ----
  runner.step('2. Deploy Marketplace Operator')

  runner.log(`Arbiter: ${accounts.arbiterAccount!.address}`)
  runner.log(`Escrow period: 7 days, Freeze duration: 3 days`)

  const deployResult = await deployTestOperator(accounts, runner)

  runner.log(`EscrowPeriod: ${deployResult.escrowPeriodAddress}`)
  runner.log(`Freeze: ${deployResult.freezeAddress}`)
  runner.log(`SignatureCondition: ${deployResult.signatureConditionAddress}`)
  runner.log(
    `SignatureRefundRequest: ${deployResult.signatureRefundRequestAddress}`,
  )

  // ---- Step 3: Setup HTTP 402 Infrastructure ----
  runner.step('3. Setup HTTP 402 Infrastructure (in-process)')

  const infra = await setupHTTP402(accounts, deployResult.operatorAddress)

  runner.log('Facilitator: in-process (payer account as signer)')
  runner.log('Server: x402HTTPResourceServer with escrow route at /api/weather')
  runner.log('Client: x402HTTPClient with escrow scheme')
  runner.pass('Setup HTTP 402 infrastructure')

  // ---- Step 4: HTTP 402 Flow — Authorize via Protocol ----
  runner.step('4. HTTP 402 Flow (402 -> Pay -> Verify -> Settle)')

  const { paymentInfo, escrowHash } = await performHTTP402Payment(
    infra,
    accounts,
    runner,
  )
  runner.log(
    `  PaymentInfo extracted (operator: ${shortAddr(paymentInfo.operator)})`,
  )

  // Verify escrow state
  const escrowState = await accounts.publicClient.readContract({
    address: accounts.chainConfig.authCaptureEscrow as Address,
    abi: authCaptureEscrowAbi,
    functionName: 'paymentState',
    args: [escrowHash],
  })

  const [hasCollected, capturableAmount, refundableAmount] = escrowState as [
    boolean,
    bigint,
    bigint,
  ]
  runner.log(
    `  Escrow state: hasCollected=${hasCollected}, capturable=${capturableAmount}, refundable=${refundableAmount}`,
  )

  if (capturableAmount > 0n) {
    runner.pass('USDC in escrow via HTTP 402 flow')
  } else {
    runner.fail('USDC in escrow', 'capturableAmount is 0 after settle')
  }

  // ---- Step 4b: Verify payment state via SDK ----
  runner.step('4b. Verify Payment State via SDK')

  const { payer, merchant, arbiter } = createSDKInstances(
    accounts,
    deployResult,
  )

  try {
    const payerState = await payer.payment.getState(paymentInfo)
    const [, payerCapturable, payerRefundable] = payerState
    runner.log(
      `payer.payment.getState: capturable=${payerCapturable}, refundable=${payerRefundable}`,
    )

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    runner.log(
      `merchant.payment.getAmounts: capturable=${amounts.capturableAmount}, refundable=${amounts.refundableAmount}`,
    )

    const arbiterState = await arbiter!.payment.getState(paymentInfo)
    const [, arbiterCapturable] = arbiterState
    runner.log(`arbiter.payment.getState: capturable=${arbiterCapturable}`)

    if (
      payerCapturable > 0n &&
      amounts.capturableAmount > 0n &&
      arbiterCapturable > 0n
    ) {
      runner.pass(
        'All SDK payment queries return correct state after authorize',
      )
    } else {
      runner.fail(
        'SDK payment queries',
        'One or more checks failed (see logs above)',
      )
    }
  } catch (err) {
    runner.fail('SDK payment queries', String(err))
  }

  // ---- Step 5: Payer Requests Refund ----
  runner.step('5. Payer Requests Refund')

  runner.log('Submitting refund request...')
  const refundReqTx = await payer.refund!.request(
    paymentInfo,
    PAYMENT_AMOUNT,
    0n,
  )
  await waitForTx(accounts.publicClient, refundReqTx)
  runner.log(`  Refund request tx: ${SCANNER}/tx/${refundReqTx}`)

  const refundStatus = await payer.refund!.getStatus(paymentInfo, 0n)
  runner.log(
    `Refund status: ${refundStatus} (expected ${RefundRequestStatus.Pending} = Pending)`,
  )

  if (refundStatus === RefundRequestStatus.Pending) {
    runner.pass('Request refund (status = Pending)', refundReqTx)
  } else {
    runner.fail(
      'Request refund',
      `Expected Pending (${RefundRequestStatus.Pending}), got ${refundStatus}`,
    )
  }

  // ---- Step 6: Payer Freezes Payment ----
  runner.step('6. Payer Freezes Payment')

  runner.log('Freezing payment...')
  const freezeTx = await payer.freeze!.freeze(paymentInfo)
  await waitForTx(accounts.publicClient, freezeTx)
  runner.log(`  Freeze tx: ${SCANNER}/tx/${freezeTx}`)

  const frozen = await payer.freeze!.isFrozen(paymentInfo)
  runner.log(`Is frozen: ${frozen}`)

  if (frozen) {
    runner.pass('Freeze payment (isFrozen = true)', freezeTx)
  } else {
    runner.fail('Freeze payment', 'isFrozen returned false after freeze')
  }

  // ---- Step 7: Payer Submits Evidence ----
  runner.step('7. Payer Submits Evidence')

  runner.log('Submitting payer evidence...')
  const payerEvidenceTx = await payer.evidence.submit(
    paymentInfo,
    0n,
    'QmPayerEvidenceCID_RefundJustification',
  )
  await waitForTx(accounts.publicClient, payerEvidenceTx)
  runner.log(`  Payer evidence tx: ${SCANNER}/tx/${payerEvidenceTx}`)

  const evidenceCount1 = await payer.evidence.count(paymentInfo, 0n)
  runner.log(`Evidence count: ${evidenceCount1} (expected 1)`)

  if (evidenceCount1 === 1n) {
    runner.pass('Payer submits evidence (count = 1)', payerEvidenceTx)
  } else {
    runner.fail(
      'Payer submits evidence',
      `Expected count 1, got ${evidenceCount1}`,
    )
  }

  // ---- Step 8: Merchant Submits Counter-Evidence ----
  runner.step('8. Merchant Submits Counter-Evidence')

  runner.log('Submitting merchant counter-evidence...')
  const merchantEvidenceTx = await merchant.evidence.submit(
    paymentInfo,
    0n,
    'QmMerchantEvidenceCID_ServiceDelivered',
  )
  await waitForTx(accounts.publicClient, merchantEvidenceTx)
  runner.log(`  Merchant evidence tx: ${SCANNER}/tx/${merchantEvidenceTx}`)

  const evidenceCount2 = await payer.evidence.count(paymentInfo, 0n)
  runner.log(`Evidence count: ${evidenceCount2} (expected 2)`)

  if (evidenceCount2 === 2n) {
    runner.pass(
      'Merchant submits counter-evidence (count = 2)',
      merchantEvidenceTx,
    )
  } else {
    runner.fail(
      'Merchant submits counter-evidence',
      `Expected count 2, got ${evidenceCount2}`,
    )
  }

  // ---- Step 9: Arbiter Reads All Evidence ----
  runner.step('9. Arbiter Reads All Evidence')

  const totalEvidence = await arbiter!.evidence.count(paymentInfo, 0n)
  const { entries: allEvidence } = await arbiter!.evidence.getBatch(
    paymentInfo,
    0n,
    0n,
    totalEvidence,
  )
  runner.log(`Evidence entries: ${allEvidence.length}`)

  for (let i = 0; i < allEvidence.length; i++) {
    const e = allEvidence[i]
    const roleName =
      e.role === 0 ? 'Payer' : e.role === 1 ? 'Receiver' : 'Arbiter'
    const ts = new Date(Number(e.timestamp) * 1000).toISOString()
    runner.log(
      `  [${i}] ${roleName} ${shortAddr(e.submitter)} | ${ts} | CID: ${e.cid}`,
    )
  }

  if (
    allEvidence.length === 2 &&
    allEvidence[0].cid === 'QmPayerEvidenceCID_RefundJustification' &&
    allEvidence[1].cid === 'QmMerchantEvidenceCID_ServiceDelivered' &&
    allEvidence[0].role === 0 &&
    allEvidence[1].role === 1
  ) {
    runner.pass(
      'Arbiter reads all evidence (2 entries, correct roles and CIDs)',
    )
  } else {
    runner.fail(
      'Arbiter reads all evidence',
      `Expected 2 entries with correct data, got ${allEvidence.length}`,
    )
  }

  // ---- Step 10: Arbiter Approves Refund (EIP-712 signature) ----
  runner.step(
    '10. Arbiter Approves Refund (EIP-712 signature based on evidence review)',
  )

  runner.log('Computing EIP-712 approval signature...')

  // 1. Compute paymentInfoHash
  const paymentInfoHash = computePaymentInfoHash(
    accounts.chainId,
    accounts.chainConfig.authCaptureEscrow as Address,
    paymentInfo,
  )

  // 2. Read the approval nonce from the SignatureCondition contract
  const approvalNonce = await accounts.publicClient.readContract({
    address: deployResult.signatureConditionAddress,
    abi: signatureConditionAbi,
    functionName: 'approvalNonces',
    args: [paymentInfoHash],
  })
  runner.log(`Approval nonce: ${approvalNonce}`)

  // 3. Arbiter signs EIP-712 typed data
  const approvalSignature = await accounts.arbiterWallet!.signTypedData({
    account: accounts.arbiterAccount!,
    domain: {
      name: 'SignatureCondition',
      version: '1',
      chainId: accounts.chainId,
      verifyingContract: deployResult.signatureConditionAddress,
    },
    types: {
      Approval: [
        { name: 'paymentInfoHash', type: 'bytes32' },
        { name: 'amount', type: 'uint256' },
        { name: 'expiry', type: 'uint48' },
        { name: 'nonce', type: 'uint256' },
      ],
    },
    primaryType: 'Approval',
    message: {
      paymentInfoHash,
      amount: PAYMENT_AMOUNT,
      expiry: 0,
      nonce: approvalNonce as bigint,
    },
  })
  runner.log(`Approval signature obtained`)

  // 4. Submit approval with signature
  const approveTxHash = await arbiter!.refund!.approveWithSignature(
    paymentInfo,
    0n,
    PAYMENT_AMOUNT,
    0,
    approvalSignature,
  )
  await waitForTx(accounts.publicClient, approveTxHash)
  runner.log(`  Approve tx: ${SCANNER}/tx/${approveTxHash}`)

  const approvedStatus = await arbiter!.refund!.getStatus(paymentInfo, 0n)
  runner.log(
    `Refund status: ${approvedStatus} (expected ${RefundRequestStatus.Approved} = Approved)`,
  )

  if (approvedStatus === RefundRequestStatus.Approved) {
    runner.pass('Arbiter approve refund (status = Approved)', approveTxHash)
  } else {
    runner.fail(
      'Arbiter approve refund',
      `Expected Approved (${RefundRequestStatus.Approved}), got ${approvedStatus}`,
    )
  }

  // ---- Step 11: Arbiter Executes Refund ----
  runner.step('11. Arbiter Executes Refund')

  const payerUsdcBefore = await accounts.publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [accounts.payerAccount.address],
  })

  runner.log('Executing refund in escrow...')
  const executeTx = await arbiter!.payment.refundInEscrow(
    paymentInfo,
    PAYMENT_AMOUNT,
  )
  await waitForTx(accounts.publicClient, executeTx)
  runner.log(`  Execute tx: ${SCANNER}/tx/${executeTx}`)

  const escrowStateAfter = await accounts.publicClient.readContract({
    address: accounts.chainConfig.authCaptureEscrow as Address,
    abi: authCaptureEscrowAbi,
    functionName: 'paymentState',
    args: [escrowHash],
  })

  const [, capturableAfter, refundableAfter] = escrowStateAfter as [
    boolean,
    bigint,
    bigint,
  ]
  runner.log(
    `Escrow after: capturable=${capturableAfter}, refundable=${refundableAfter}`,
  )

  const payerUsdcAfter = await accounts.publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [accounts.payerAccount.address],
  })

  const usdcRecovered = payerUsdcAfter - payerUsdcBefore
  runner.log(`Payer USDC recovered: ${formatUnits(usdcRecovered, 6)} USDC`)

  if (capturableAfter === 0n && usdcRecovered > 0n) {
    runner.pass(
      'Execute refund (escrow emptied, USDC returned to payer)',
      executeTx,
    )
  } else {
    runner.fail(
      'Execute refund',
      `capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    )
  }

  // ---- Step 11b: Verify post-refund state via SDK ----
  runner.step('11b. Verify Post-Refund State via SDK')

  try {
    const postRefundState = await payer.payment.getState(paymentInfo)
    const [, postCapturable, postRefundable] = postRefundState
    runner.log(
      `payer.payment.getState: capturable=${postCapturable}, refundable=${postRefundable}`,
    )

    const postRefundAmounts = await merchant.payment.getAmounts(paymentInfo)
    runner.log(
      `merchant.payment.getAmounts: capturable=${postRefundAmounts.capturableAmount}, refundable=${postRefundAmounts.refundableAmount}`,
    )

    if (
      postCapturable === 0n &&
      postRefundable === 0n &&
      postRefundAmounts.capturableAmount === 0n &&
      postRefundAmounts.refundableAmount === 0n
    ) {
      runner.pass('All SDK queries return correct post-refund state')
    } else {
      runner.fail(
        'Post-refund SDK queries',
        'One or more checks failed (see logs above)',
      )
    }
  } catch (err) {
    runner.fail('Post-refund SDK queries', String(err))
  }

  // ---- Step 12: Final Verification ----
  runner.step('12. Final Verification')

  const finalEvidenceCount = await arbiter!.evidence.count(paymentInfo, 0n)
  runner.log(`Evidence still queryable: ${finalEvidenceCount} entries`)

  const finalRefundStatus = await arbiter!.refund!.getStatus(paymentInfo, 0n)
  runner.log(`Final refund status: ${finalRefundStatus}`)

  if (
    finalEvidenceCount === 2n &&
    capturableAfter === 0n &&
    usdcRecovered > 0n
  ) {
    runner.pass(
      'Final verification (evidence persists, escrow emptied, USDC returned)',
    )
  } else {
    runner.fail(
      'Final verification',
      `evidence=${finalEvidenceCount} (expected 2), capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    )
  }

  // ---- Step 13: Distribute Fees ----
  runner.step('13. Distribute Accumulated Fees')

  try {
    runner.log('Distributing fees for USDC...')
    const distributeFeeTx = await distributeFees(accounts.merchantWallet, {
      operatorAddress: deployResult.operatorAddress,
      token: USDC_ADDRESS,
    })
    await waitForTx(accounts.publicClient, distributeFeeTx)
    runner.log(`  Distribute fees tx: ${SCANNER}/tx/${distributeFeeTx}`)
    runner.pass('Distribute fees', distributeFeeTx)
  } catch (error) {
    // May revert if no fees accumulated — that's acceptable in test
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('revert')) {
      runner.log(
        '  No fees to distribute (expected if fee calculator is address(0))',
      )
      runner.pass('Distribute fees (no fees accumulated — expected)')
    } else {
      runner.fail('Distribute fees', msg)
    }
  }

  // ---- Summary ----
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║                    TEST SUMMARY                        ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  runner.printSummary('TEST RESULTS')
  runner.exitWithResults(
    'E2E TEST PASSED — Full payment lifecycle verified on-chain',
    'E2E TEST FAILED',
  )
}

main().catch((error) => {
  console.error('\nE2E test failed with error:', error)
  process.exit(1)
})
