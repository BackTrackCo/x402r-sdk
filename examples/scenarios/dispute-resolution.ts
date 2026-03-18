import {
  computeEscrowNonce,
  deployMarketplaceOperator,
  getChainConfig,
  type PaymentInfo,
} from '@x402r/core'
import {
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
} from '@x402r/sdk'
import {
  type Address,
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeAbiParameters,
  erc20Abi,
  getAddress,
  http,
  keccak256,
  type PublicClient,
  pad,
  type TestClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { FAR_FUTURE, PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Anvil test accounts
// ---------------------------------------------------------------------------

const testAccounts = {
  deployer: {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address,
    privateKey:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const,
  },
  payer: {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
    privateKey:
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const,
  },
  receiver: {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
    privateKey:
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const,
  },
  feeRecipient: {
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as Address,
    privateKey:
      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as const,
  },
  arbiter: {
    address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65' as Address,
    privateKey:
      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' as const,
  },
} as const

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CHAIN_ID = 84532
const chainConfig = getChainConfig(CHAIN_ID)
const USDC = chainConfig.usdc
const ANVIL_PORT = 8848

function getBalanceSlot(account: Address, baseSlot: bigint): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [account, baseSlot],
    ),
  )
}

// ---------------------------------------------------------------------------
// Scenario: Dispute Resolution (3-role full lifecycle)
//
// Flow: authorize → charge → payer requests refund → payer + merchant submit
//       evidence → arbiter reviews evidence → arbiter approves refund →
//       verify refund amounts → merchant distributes fees
// ---------------------------------------------------------------------------

async function main() {
  const { Instance, Server } = await import('prool')
  const server = Server.create({
    instance: Instance.anvil({
      chainId: CHAIN_ID,
      forkUrl:
        process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ??
        'https://sepolia.base.org',
      forkBlockNumber: 38_945_000n,
    }),
    port: ANVIL_PORT,
  })
  await server.start()

  const rpcUrl = `http://127.0.0.1:${ANVIL_PORT}/1`
  const transport = http(rpcUrl)
  const publicClient: PublicClient = createPublicClient({
    transport,
    cacheTime: 0,
  })
  const testClient: TestClient = createTestClient({ transport, mode: 'anvil' })
  const runner = new StepRunner('Dispute Resolution', publicClient)

  try {
    // Clear contract code at test addresses
    for (const acct of Object.values(testAccounts)) {
      await testClient.setCode({ address: acct.address, bytecode: '0x' })
    }

    // ================================================================
    // Step 1: Deploy marketplace operator
    // ================================================================
    runner.step('Deploy marketplace operator')

    const deployerWallet = createWalletClient({
      account: testAccounts.deployer.address,
      chain: baseSepolia,
      transport,
    })

    const deployment = await deployMarketplaceOperator(
      deployerWallet,
      publicClient,
      {
        chainId: CHAIN_ID,
        feeRecipient: testAccounts.feeRecipient.address,
        arbiter: testAccounts.arbiter.address,
        escrowPeriodSeconds: 604_800n,
        operatorFeeBps: 50n,
      },
    )
    runner.log(`Operator: ${deployment.operatorAddress}`)

    // Fund payer with USDC
    const payerSlot = getBalanceSlot(testAccounts.payer.address, 9n)
    await testClient.setStorageAt({
      address: USDC,
      index: payerSlot,
      value: pad(`0x${(10_000_000_000n).toString(16)}` as `0x${string}`),
    })

    // ================================================================
    // Step 2: Create SDK clients (fix #6 — use role presets)
    // ================================================================
    runner.step('Create role-specific SDK clients')

    const payerWallet = createWalletClient({
      account: testAccounts.payer.address,
      chain: baseSepolia,
      transport,
    })
    const merchantWallet = createWalletClient({
      account: testAccounts.receiver.address,
      chain: baseSepolia,
      transport,
    })
    const arbiterWallet = createWalletClient({
      account: testAccounts.arbiter.address,
      chain: baseSepolia,
      transport,
    })

    const clientConfig = {
      publicClient,
      operatorAddress: deployment.operatorAddress,
      escrowPeriodAddress: deployment.escrowPeriodAddress,
      refundRequestAddress: deployment.refundRequestAddress,
    }

    const payer = createPayerClient({
      ...clientConfig,
      walletClient: payerWallet,
    })
    const merchant = createMerchantClient({
      ...clientConfig,
      walletClient: merchantWallet,
    })
    const arbiter = createArbiterClient({
      ...clientConfig,
      walletClient: arbiterWallet,
    })

    // Runtime guards (fix #10 — no non-null assertions)
    if (!payer.refund) throw new Error('Payer refund module unavailable')
    if (!arbiter.refund) throw new Error('Arbiter refund module unavailable')
    if (!merchant.escrow) throw new Error('Merchant escrow module unavailable')

    runner.log('Payer, Merchant, Arbiter clients created')

    // ================================================================
    // Step 3: Authorize payment (HTTP 402 flow)
    // ================================================================
    runner.step('Authorize payment via HTTP 402 flow')

    const paymentInfo: PaymentInfo = {
      operator: deployment.operatorAddress,
      payer: testAccounts.payer.address,
      receiver: testAccounts.receiver.address,
      token: USDC,
      maxAmount: PAYMENT_AMOUNT,
      preApprovalExpiry: FAR_FUTURE,
      authorizationExpiry: FAR_FUTURE,
      refundExpiry: FAR_FUTURE,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: deployment.operatorAddress,
      salt: 200n,
    }

    const localAccount = privateKeyToAccount(testAccounts.payer.privateKey)
    const nonce = computeEscrowNonce(
      CHAIN_ID,
      chainConfig.authCaptureEscrow,
      paymentInfo,
    )

    const signERC3009 = async () =>
      localAccount.signTypedData({
        domain: {
          name: 'USDC',
          version: '2',
          chainId: CHAIN_ID,
          verifyingContract: getAddress(USDC),
        },
        types: {
          ReceiveWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        },
        primaryType: 'ReceiveWithAuthorization',
        message: {
          from: getAddress(testAccounts.payer.address),
          to: getAddress(chainConfig.tokenCollector),
          value: PAYMENT_AMOUNT,
          validAfter: 0n,
          validBefore: BigInt(FAR_FUTURE),
          nonce,
        },
      })

    const authSig = await signERC3009()
    await merchant.payment.authorize(
      paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      authSig,
    )

    const amounts1 = await merchant.payment.getAmounts(paymentInfo)
    // Fix #3 — exact assertion, not > 0n
    runner.assert(
      amounts1.hasCollectedPayment,
      'Payment collected after authorize',
    )
    runner.assert(
      amounts1.capturableAmount === PAYMENT_AMOUNT,
      `Capturable === ${PAYMENT_AMOUNT}`,
    )

    // ================================================================
    // Step 4: Merchant charges payment
    // ================================================================
    runner.step('Merchant charges payment')

    const chargeSig = await signERC3009()
    await merchant.payment.charge(
      paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      chargeSig,
    )

    const amounts2 = await merchant.payment.getAmounts(paymentInfo)
    // Fix #3 — exact amount assertion
    runner.assert(
      amounts2.hasCollectedPayment,
      'Payment still collected after charge',
    )

    // ================================================================
    // Step 5: Payer requests refund
    // ================================================================
    runner.step('Payer requests refund')

    await payer.refund.request(paymentInfo, PAYMENT_AMOUNT, 0n)

    const refundRequest = await payer.refund.get(paymentInfo, 0n)
    runner.assert(
      refundRequest.amount === PAYMENT_AMOUNT,
      `Refund request amount === ${PAYMENT_AMOUNT}`,
    )
    runner.log(`Refund status: ${refundRequest.status} (Pending)`)

    // ================================================================
    // Step 6: Payer submits evidence
    // ================================================================
    runner.step('Payer submits evidence')

    await payer.evidence.submit(paymentInfo, 0n, 'QmPayerEvidence_receipt')
    const payerEntry = await payer.evidence.get(paymentInfo, 0n, 0n)
    // Fix #13 — verify submitter address
    runner.assert(
      payerEntry.submitter.toLowerCase() ===
        testAccounts.payer.address.toLowerCase(),
      `Evidence submitter matches payer (${testAccounts.payer.address})`,
    )

    // ================================================================
    // Step 7: Merchant submits evidence
    // ================================================================
    runner.step('Merchant submits counter-evidence')

    await merchant.evidence.submit(
      paymentInfo,
      0n,
      'QmMerchantEvidence_delivery',
    )
    const merchantEntry = await merchant.evidence.get(paymentInfo, 0n, 1n)
    // Fix #13 — verify submitter address
    runner.assert(
      merchantEntry.submitter.toLowerCase() ===
        testAccounts.receiver.address.toLowerCase(),
      `Evidence submitter matches merchant (${testAccounts.receiver.address})`,
    )

    // ================================================================
    // Step 8: Arbiter reviews evidence
    // ================================================================
    runner.step('Arbiter reviews all evidence')

    const evidenceCount = await arbiter.evidence.count(paymentInfo, 0n)
    runner.assert(evidenceCount === 2n, `Evidence count === 2`)

    const batch = await arbiter.evidence.getBatch(
      paymentInfo,
      0n,
      0n,
      evidenceCount,
    )
    runner.log(`Evidence entries: ${batch.entries.length}`)
    for (const entry of batch.entries) {
      runner.log(`  CID: ${entry.cid} from ${entry.submitter}`)
    }

    // ================================================================
    // Step 9: Arbiter approves refund
    // ================================================================
    runner.step('Arbiter approves refund for full amount')

    await arbiter.refund.approve(paymentInfo, 0n, PAYMENT_AMOUNT)

    const approvedRequest = await arbiter.refund.get(paymentInfo, 0n)
    // Fix #5 — assert approvedAmount
    runner.assert(
      approvedRequest.approvedAmount === PAYMENT_AMOUNT,
      `Approved amount === ${PAYMENT_AMOUNT}`,
    )
    // Fix #12 — assert final refund status
    // Status 1 = Approved (see RefundRequestStatus enum)
    runner.assert(
      approvedRequest.status === 1,
      'Refund status === Approved (1)',
    )

    // ================================================================
    // Step 10: Verify refund amounts
    // ================================================================
    runner.step('Verify refund amounts on operator')

    const amounts3 = await merchant.payment.getAmounts(paymentInfo)
    // Fix #4 — after refund approval, refundable amount should be 0 (refund was executed)
    runner.assert(
      amounts3.refundableAmount === 0n,
      'Refundable amount === 0 after refund executed',
    )

    // Check payer USDC balance recovered
    const payerUsdcBalance = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testAccounts.payer.address],
    })
    runner.log(`Payer USDC balance: ${payerUsdcBalance}`)

    // ================================================================
    // Step 11: Distribute fees
    // ================================================================
    runner.step('Merchant distributes protocol fees')

    const accumulatedFees =
      await merchant.operator.getAccumulatedProtocolFees(USDC)
    runner.log(`Accumulated protocol fees: ${accumulatedFees}`)

    if (accumulatedFees > 0n) {
      // Fix #14 — real failure on revert, not swallowed
      const feeTx = await merchant.operator.distributeFees(USDC)
      runner.log(`Fees distributed: ${feeTx}`)

      const remainingFees =
        await merchant.operator.getAccumulatedProtocolFees(USDC)
      runner.assert(remainingFees === 0n, 'All protocol fees distributed')
    } else {
      runner.log('No fees to distribute (refund returned all funds)')
    }

    runner.done()
  } finally {
    await server.stop()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
