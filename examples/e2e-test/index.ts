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

import { authCaptureEscrowAbi, RefundRequestStatus } from '@x402r/core'
import { type Address, erc20Abi, formatUnits } from 'viem'

import {
  checkAndLogBalances,
  fundDerivedAccounts,
  setupE2EAccounts,
} from './accounts.js'
import { PAYMENT_AMOUNT, SCANNER, shortAddr, waitForTx } from './config.js'
import { performHTTP402Payment, setupHTTP402 } from './http402.js'
import { StepRunner } from './runner.js'
import { createSDKInstances, deployTestOperator } from './sdk.js'

// ============ Main ============

async function main() {
  console.log('==============================================================')
  console.log('       x402r E2E Integration Test -- Base Sepolia')
  console.log('==============================================================')

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
  runner.log(`RefundRequest: ${deployResult.refundRequestAddress}`)
  runner.log(
    `RefundInEscrowCondition: ${deployResult.refundInEscrowConditionAddress}`,
  )
  runner.log(
    `RefundRequestEvidence: ${deployResult.refundRequestEvidenceAddress}`,
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

  runner.assert(
    capturableAmount === PAYMENT_AMOUNT,
    'USDC in escrow via HTTP 402 flow',
    `capturableAmount=${capturableAmount}, expected ${PAYMENT_AMOUNT}`,
  )

  // ---- Step 4b: Verify payment state via SDK ----
  runner.step('4b. Verify Payment State via SDK')

  const {
    payer,
    merchant,
    arbiter: arbiterOrUndefined,
  } = createSDKInstances(accounts, deployResult)

  if (!arbiterOrUndefined) {
    throw new Error('Arbiter client is required for this test')
  }
  const arbiter = arbiterOrUndefined

  const payerState = await payer.payment.getState(paymentInfo)
  const [, payerCapturable, payerRefundable] = payerState
  runner.log(
    `payer.payment.getState: capturable=${payerCapturable}, refundable=${payerRefundable}`,
  )

  const amounts = await merchant.payment.getAmounts(paymentInfo)
  runner.log(
    `merchant.payment.getAmounts: capturable=${amounts.capturableAmount}, refundable=${amounts.refundableAmount}`,
  )

  const arbiterState = await arbiter.payment.getState(paymentInfo)
  const [, arbiterCapturable] = arbiterState
  runner.log(`arbiter.payment.getState: capturable=${arbiterCapturable}`)

  runner.assert(
    payerCapturable === PAYMENT_AMOUNT &&
      amounts.capturableAmount === PAYMENT_AMOUNT &&
      arbiterCapturable === PAYMENT_AMOUNT,
    'All SDK payment queries return correct state after authorize',
    `payer=${payerCapturable}, merchant=${amounts.capturableAmount}, arbiter=${arbiterCapturable} (expected ${PAYMENT_AMOUNT})`,
  )

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

  runner.assert(
    refundStatus === RefundRequestStatus.Pending,
    'Request refund (status = Pending)',
    `Expected Pending (${RefundRequestStatus.Pending}), got ${refundStatus}`,
  )

  // ---- Step 6: Payer Freezes Payment ----
  runner.step('6. Payer Freezes Payment')

  runner.log('Freezing payment...')
  const freezeTx = await payer.freeze!.freeze(paymentInfo)
  await waitForTx(accounts.publicClient, freezeTx)
  runner.log(`  Freeze tx: ${SCANNER}/tx/${freezeTx}`)

  const frozen = await payer.freeze!.isFrozen(paymentInfo)
  runner.log(`Is frozen: ${frozen}`)

  runner.assert(
    frozen,
    'Freeze payment (isFrozen = true)',
    'isFrozen returned false after freeze',
  )

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

  runner.assert(
    evidenceCount1 === 1n,
    'Payer submits evidence (count = 1)',
    `Expected count 1, got ${evidenceCount1}`,
  )

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

  runner.assert(
    evidenceCount2 === 2n,
    'Merchant submits counter-evidence (count = 2)',
    `Expected count 2, got ${evidenceCount2}`,
  )

  // ---- Step 9: Arbiter Reads All Evidence ----
  runner.step('9. Arbiter Reads All Evidence')

  const totalEvidence = await arbiter.evidence.count(paymentInfo, 0n)
  const { entries: allEvidence } = await arbiter.evidence.getBatch(
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

  runner.assert(
    allEvidence.length === 2 &&
      allEvidence[0].cid === 'QmPayerEvidenceCID_RefundJustification' &&
      allEvidence[1].cid === 'QmMerchantEvidenceCID_ServiceDelivered' &&
      allEvidence[0].role === 0 &&
      allEvidence[1].role === 1 &&
      allEvidence[0].submitter === accounts.payerAccount.address &&
      allEvidence[1].submitter === accounts.merchantAccount.address,
    'Arbiter reads all evidence (2 entries, correct roles, CIDs, and submitters)',
    `Expected 2 entries with correct data, got ${allEvidence.length}`,
  )

  // ---- Step 10: Arbiter Approves Refund (atomic in-escrow refund) ----
  runner.step(
    '10. Arbiter Approves Refund (approve() atomically calls refundInEscrow)',
  )

  const payerUsdcBefore = await accounts.publicClient.readContract({
    address: accounts.chainConfig.usdc as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [accounts.payerAccount.address],
  })

  runner.log('Submitting arbiter approval (triggers atomic refund)...')
  const approveTxHash = await arbiter.refund!.approve(
    paymentInfo,
    0n,
    PAYMENT_AMOUNT,
  )
  await waitForTx(accounts.publicClient, approveTxHash)
  runner.log(`  Approve tx: ${SCANNER}/tx/${approveTxHash}`)

  const approvedStatus = await arbiter.refund!.getStatus(paymentInfo, 0n)
  runner.log(
    `Refund status: ${approvedStatus} (expected ${RefundRequestStatus.Approved} = Approved)`,
  )

  runner.assert(
    approvedStatus === RefundRequestStatus.Approved,
    'Arbiter approve refund (status = Approved)',
    `Expected Approved (${RefundRequestStatus.Approved}), got ${approvedStatus}`,
  )

  // Verify approvedAmount on the refund request
  const approvedRequest = await arbiter.refund!.get(paymentInfo, 0n)
  runner.log(`Approved amount: ${approvedRequest.approvedAmount}`)

  runner.assert(
    approvedRequest.approvedAmount === PAYMENT_AMOUNT,
    'Approved amount matches payment amount',
    `Expected ${PAYMENT_AMOUNT}, got ${approvedRequest.approvedAmount}`,
  )

  // ---- Step 11: Verify Atomic Refund Executed ----
  runner.step('11. Verify Atomic Refund Executed')

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
    address: accounts.chainConfig.usdc as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [accounts.payerAccount.address],
  })

  const usdcRecovered = payerUsdcAfter - payerUsdcBefore
  runner.log(`Payer USDC recovered: ${formatUnits(usdcRecovered, 6)} USDC`)

  runner.assert(
    capturableAfter === 0n && usdcRecovered === PAYMENT_AMOUNT,
    'Atomic refund verified (escrow emptied, USDC returned to payer)',
    `capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected ${PAYMENT_AMOUNT})`,
  )

  // ---- Step 11b: Verify post-refund state via SDK ----
  runner.step('11b. Verify Post-Refund State via SDK')

  const postRefundState = await payer.payment.getState(paymentInfo)
  const [, postCapturable, postRefundable] = postRefundState
  runner.log(
    `payer.payment.getState: capturable=${postCapturable}, refundable=${postRefundable}`,
  )

  const postRefundAmounts = await merchant.payment.getAmounts(paymentInfo)
  runner.log(
    `merchant.payment.getAmounts: capturable=${postRefundAmounts.capturableAmount}, refundable=${postRefundAmounts.refundableAmount}`,
  )

  runner.assert(
    postCapturable === 0n &&
      postRefundable === 0n &&
      postRefundAmounts.capturableAmount === 0n &&
      postRefundAmounts.refundableAmount === 0n,
    'All SDK queries return correct post-refund state',
    'One or more checks failed (see logs above)',
  )

  // ---- Step 12: Final Verification ----
  runner.step('12. Final Verification')

  const finalEvidenceCount = await arbiter.evidence.count(paymentInfo, 0n)
  runner.log(`Evidence still queryable: ${finalEvidenceCount} entries`)

  const finalRefundStatus = await arbiter.refund!.getStatus(paymentInfo, 0n)
  runner.log(`Final refund status: ${finalRefundStatus}`)

  runner.assert(
    finalEvidenceCount === 2n &&
      capturableAfter === 0n &&
      usdcRecovered === PAYMENT_AMOUNT &&
      finalRefundStatus === RefundRequestStatus.Approved,
    'Final verification (evidence persists, escrow emptied, USDC returned, status Approved)',
    `evidence=${finalEvidenceCount} (expected 2), capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected ${PAYMENT_AMOUNT}), status=${finalRefundStatus} (expected ${RefundRequestStatus.Approved})`,
  )

  // ---- Step 13: Distribute Fees ----
  runner.step('13. Distribute Accumulated Fees')

  // The full payment was refunded, so there may be no fees to distribute.
  // Check accumulated fees before calling distributeFees to avoid a revert.
  const accumulatedFees = await merchant.operator.getAccumulatedProtocolFees(
    accounts.chainConfig.usdc as Address,
  )
  runner.log(
    `Accumulated protocol fees: ${formatUnits(accumulatedFees, 6)} USDC`,
  )

  if (accumulatedFees > 0n) {
    runner.log('Distributing fees for USDC...')
    const distributeFeeTx = await merchant.operator.distributeFees(
      accounts.chainConfig.usdc as Address,
    )
    await waitForTx(accounts.publicClient, distributeFeeTx)
    runner.log(`  Distribute fees tx: ${SCANNER}/tx/${distributeFeeTx}`)
    runner.pass('Distribute fees', distributeFeeTx)
  } else {
    runner.log(
      '  No fees to distribute (full refund executed, no fees accumulated)',
    )
    runner.pass(
      'Distribute fees (no fees accumulated -- expected after full refund)',
    )
  }

  // ---- Summary ----
  console.log(
    '\n==============================================================',
  )
  console.log('                    TEST SUMMARY')
  console.log('==============================================================')

  runner.printSummary('TEST RESULTS')
  runner.exitWithResults(
    'E2E TEST PASSED -- Full payment lifecycle verified on-chain',
    'E2E TEST FAILED',
  )
}

main().catch((error) => {
  console.error('\nE2E test failed with error:', error)
  process.exit(1)
})
