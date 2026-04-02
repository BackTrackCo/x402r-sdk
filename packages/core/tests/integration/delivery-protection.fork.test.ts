import type { PublicClient, TestClient, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type ArbiterClient,
  createArbiterClient,
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import { getOperatorConfig } from '../../src/actions/index.js'
import { x402rChains } from '../../src/config/index.js'
import {
  type DeliveryProtectionOperatorDeployment,
  deployDeliveryProtectionOperator,
} from '../../src/deploy/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, FAR_FUTURE, testRoles } from '../setup/constants.js'
import { deployTestFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc
const ESCROW_PERIOD_SECONDS = 172800n // 2 days — distinct from other fixtures
const ESCROW_FAST_FORWARD = 172801 // 2 days + 1 second

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let walletClient: WalletClient
let deployment: DeliveryProtectionOperatorDeployment

let payerClient: X402r
let arbiterClient: ArbiterClient
let merchant: MerchantClient
let paymentInfo: PaymentInfo

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  testClient = anvilBaseSepolia.getTestClient()
  walletClient = anvilBaseSepolia.getWalletClient(testRoles.deployer.address)

  // Deploy fixtures to clear code at test accounts and fund payer with USDC
  await deployTestFixtures(publicClient, walletClient, testClient)

  // Deploy delivery protection operator via preset (tested in deploy.fork.test.ts)
  deployment = await deployDeliveryProtectionOperator(
    walletClient,
    publicClient,
    {
      chainId: 84532,
      arbiter: testRoles.arbiter.address,
      feeRecipient: testRoles.operatorFeeRecipient.address,
      escrowPeriodSeconds: ESCROW_PERIOD_SECONDS,
    },
  )

  const operatorAddress = deployment.operatorAddress
  const escrowPeriodAddress = deployment.escrowPeriodAddress

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress,
    escrowPeriodAddress,
  })

  arbiterClient = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress,
    escrowPeriodAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress,
    escrowPeriodAddress,
  })

  paymentInfo = {
    operator: operatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: DEFAULT_AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: operatorAddress,
    salt: 200n, // distinct from other fork tests
  }
}, 60_000)

// ---------------------------------------------------------------------------
// Verify on-chain operator config
// ---------------------------------------------------------------------------

describe('Delivery Protection: operator config verification', () => {
  it('operator has correct condition addresses', async () => {
    const config = await getOperatorConfig(publicClient, {
      operatorAddress: deployment.operatorAddress,
    })

    // releaseCondition: OrCondition([SAC(arbiter), PayerCondition])
    expect(config.releaseCondition.toLowerCase()).toBe(
      deployment.releaseConditionAddress.toLowerCase(),
    )
    expect(config.releaseCondition).not.toBe(zeroAddress)

    // refundInEscrowCondition: OrCondition([EscrowPeriod, ReceiverCondition, SAC(arbiter)])
    expect(config.refundInEscrowCondition.toLowerCase()).toBe(
      deployment.refundInEscrowConditionAddress.toLowerCase(),
    )
    expect(config.refundInEscrowCondition).not.toBe(zeroAddress)

    // authorizeRecorder: EscrowPeriod (or RecorderCombinator when PaymentIndexRecorder available)
    expect(config.authorizeRecorder.toLowerCase()).toBe(
      deployment.authorizeRecorderAddress.toLowerCase(),
    )

    // feeCalculator should be zero (no fees)
    expect(config.feeCalculator).toBe(zeroAddress)
  })
})

// ---------------------------------------------------------------------------
// Happy path: authorize → arbiter calls release() → funds move
// ---------------------------------------------------------------------------

describe('Delivery Protection: arbiter-gated release', () => {
  it('authorize creates a capturable payment', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )

    const hash = await payerClient.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status === 'reverted') {
      console.log('Authorize tx reverted. Hash:', hash)
      console.log('Gas used:', receipt.gasUsed.toString())
      try {
        const trace = (await publicClient.request({
          method: 'debug_traceTransaction' as never,
          params: [hash, { tracer: 'callTracer' }] as never,
        })) as {
          calls?: unknown[]
          error?: string
          output?: string
          to?: string
          from?: string
        }
        // Walk the call tree to find the deepest revert
        function findReverts(node: Record<string, unknown>, depth = 0): void {
          const prefix = '  '.repeat(depth)
          if (node.error) {
            console.log(
              `${prefix}REVERT at ${node.to}: output=${node.output} error=${node.error}`,
            )
          }
          if (Array.isArray(node.calls)) {
            for (const c of node.calls)
              findReverts(c as Record<string, unknown>, depth + 1)
          }
        }
        findReverts(trace as Record<string, unknown>)
      } catch {
        console.log('debug_traceTransaction not available')
      }
    }
    expect(receipt.status).toBe('success')

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.hasCollectedPayment).toBe(true)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
  }, 60_000)

  it('payer releases their own payment', async () => {
    const newPaymentInfo = { ...paymentInfo, salt: 201n }
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      newPaymentInfo,
    )

    const authHash = await payerClient.payment.authorize(
      newPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    const releaseHash = await payerClient.payment.release(
      newPaymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash: releaseHash })

    const amounts = await merchant.payment.getAmounts(newPaymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)

  it('arbiter releases funds (no escrow wait required)', async () => {
    // Arbiter can release immediately — releaseCondition is
    // OrCondition([SAC(arbiter), PayerCondition]), no time delay needed.
    const hash = await arbiterClient.payment.release(
      paymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Arbiter immediate refund (FAIL-fast): arbiter calls refundInEscrow()
// without waiting for escrow period
// ---------------------------------------------------------------------------

describe('Delivery Protection: arbiter immediate refund', () => {
  let arbiterRefundPaymentInfo: PaymentInfo

  beforeAll(async () => {
    arbiterRefundPaymentInfo = { ...paymentInfo, salt: 203n }
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      arbiterRefundPaymentInfo,
    )

    const hash = await payerClient.payment.authorize(
      arbiterRefundPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })
  }, 60_000)

  it('arbiter refunds immediately without escrow wait', async () => {
    // No time-forwarding — arbiter is in the OrCondition, can refund immediately
    const hash = await arbiterClient.payment.refundInEscrow(
      arbiterRefundPaymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(arbiterRefundPaymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Receiver voluntary refund: merchant calls refundInEscrow() during escrow
// ---------------------------------------------------------------------------

describe('Delivery Protection: receiver voluntary refund', () => {
  let receiverRefundPaymentInfo: PaymentInfo

  beforeAll(async () => {
    receiverRefundPaymentInfo = { ...paymentInfo, salt: 204n }
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      receiverRefundPaymentInfo,
    )

    const hash = await payerClient.payment.authorize(
      receiverRefundPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })
  }, 60_000)

  it('receiver refunds during escrow without arbiter', async () => {
    // No time-forwarding — receiver is in the OrCondition, can refund immediately
    const hash = await merchant.payment.refundInEscrow(
      receiverRefundPaymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(receiverRefundPaymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Timeout path: authorize → escrow expires → anyone calls refundInEscrow()
// ---------------------------------------------------------------------------

describe('Delivery Protection: timeout auto-refund', () => {
  let timeoutPaymentInfo: PaymentInfo

  beforeAll(async () => {
    timeoutPaymentInfo = { ...paymentInfo, salt: 202n }

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      timeoutPaymentInfo,
    )

    const hash = await payerClient.payment.authorize(
      timeoutPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })
  }, 60_000)

  it('refundInEscrow succeeds after escrow expires', async () => {
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const hash = await payerClient.payment.refundInEscrow(
      timeoutPaymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(timeoutPaymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// PaymentIndexRecorder: verify on-chain payment indexing after authorize
// ---------------------------------------------------------------------------

describe('Delivery Protection: PaymentIndexRecorder', () => {
  it('indexes authorized payment by payer', async () => {
    const { paymentIndexRecorderAbi } = await import(
      '../../src/abis/generated.js'
    )

    const [, total] = await publicClient.readContract({
      address: deployment.paymentIndexRecorderAddress,
      abi: paymentIndexRecorderAbi,
      functionName: 'getPayerPayments',
      args: [testRoles.payer.address, 0n, 10n],
    })

    // At least 1 payment indexed (the authorize from the first test)
    expect(total).toBeGreaterThan(0n)
  }, 60_000)
})
