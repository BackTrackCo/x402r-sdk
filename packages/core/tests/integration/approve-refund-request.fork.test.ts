import type { PublicClient, TestClient } from 'viem'
import { erc20Abi } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type ArbiterClient,
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
  createX402r,
  type MerchantClient,
  type PayerClient,
  type X402r,
} from '../../../sdk/src/index.js'
import { x402rChains } from '../../src/config/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import {
  DEFAULT_AMOUNT,
  ESCROW_FAST_FORWARD,
  testRoles,
} from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

const baseSepolia = x402rChains[84532]

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let facilitator: X402r
let payer: PayerClient
let merchant: MerchantClient
let arbiter: ArbiterClient

const REFUND_AMOUNT = 600_000n

let paymentInfo: PaymentInfo
let payerBalanceBefore: bigint

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 8n,
    operator: 'arbiterRefund',
  }))

  // Use arbiterRefundOperator — refundInEscrow gated by StaticAddressCondition(refundRequest)
  facilitator = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  payer = createPayerClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  arbiter = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
  })
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 8: Arbiter approves refund request — in-escrow atomic refund (Flow 7a)
// ---------------------------------------------------------------------------

describe('Scenario 8: Approve refund request (Flow 7)', () => {
  it('authorize creates a payment in escrow', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const hash = await facilitator.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await payer.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)

    // Record payer balance before refund for later assertion
    payerBalanceBefore = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
  }, 60_000)

  it('payer requests refund', async () => {
    const hash = await payer.refund!.request(paymentInfo, REFUND_AMOUNT, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo, 0n)
    // Pending = 0
    expect(status).toBe(0)
  }, 60_000)

  it('arbiter approves — funds returned atomically from escrow', async () => {
    const hash = await arbiter.refund!.approve(paymentInfo, 0n, REFUND_AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo, 0n)
    // Approved = 1
    expect(status).toBe(1)

    const request = await arbiter.refund!.get(paymentInfo, 0n)
    expect(request.approvedAmount).toBe(REFUND_AMOUNT)

    // Verify payer USDC balance increased by refund amount
    const payerBalanceAfter = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(payerBalanceAfter - payerBalanceBefore).toBe(REFUND_AMOUNT)
  }, 60_000)

  it('release remaining after escrow period passes', async () => {
    // Fast-forward past the 7-day escrow period
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const releaseHash = await merchant.payment.release(
      paymentInfo,
      DEFAULT_AMOUNT - REFUND_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash: releaseHash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Scenario 8b: Merchant approves in-escrow refund (Flow 7a — merchant arm)
// ---------------------------------------------------------------------------

describe('Scenario 8b: Merchant approves refund request', () => {
  let paymentInfo2: PaymentInfo
  let payerBalance2Before: bigint

  beforeAll(async () => {
    // Reuse fixtures but create a fresh payment with a different salt
    const scenario2 = await setupScenario({
      salt: 9n,
      operator: 'arbiterRefund',
    })
    paymentInfo2 = scenario2.paymentInfo
  }, 60_000)

  it('authorize creates a payment in escrow', async () => {
    const facilitator2 = createX402r({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: fixtures.escrowPeriodAddress,
    })

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo2,
    )
    const hash = await facilitator2.payment.authorize(
      paymentInfo2,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    payerBalance2Before = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
  }, 60_000)

  it('payer requests refund', async () => {
    const hash = await payer.refund!.request(paymentInfo2, REFUND_AMOUNT, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo2, 0n)
    expect(status).toBe(0) // Pending
  }, 60_000)

  it('merchant approves — funds returned atomically from escrow', async () => {
    // Merchant has approve() on MerchantClient.refund
    const merchantWithRefund = createMerchantClient({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(
        testRoles.receiver.address,
      ),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: fixtures.escrowPeriodAddress,
      refundRequestAddress: fixtures.refundRequestAddress,
    })

    const hash = await merchantWithRefund.refund!.approve(
      paymentInfo2,
      0n,
      REFUND_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo2, 0n)
    expect(status).toBe(1) // Approved

    // Verify payer USDC balance increased
    const payerBalance2After = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(payerBalance2After - payerBalance2Before).toBe(REFUND_AMOUNT)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Scenario 8c: approve() reverts after escrow expires
// ---------------------------------------------------------------------------

describe('Scenario 8c: Approve reverts after escrow expires', () => {
  let paymentInfo3: PaymentInfo

  beforeAll(async () => {
    const scenario3 = await setupScenario({
      salt: 10n,
      operator: 'arbiterRefund',
    })
    paymentInfo3 = scenario3.paymentInfo
  }, 60_000)

  it('authorize + request refund', async () => {
    const facilitator3 = createX402r({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: fixtures.escrowPeriodAddress,
    })

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo3,
    )
    const hash = await facilitator3.payment.authorize(
      paymentInfo3,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const payer3 = createPayerClient({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      refundRequestAddress: fixtures.refundRequestAddress,
    })
    const reqHash = await payer3.refund!.request(
      paymentInfo3,
      DEFAULT_AMOUNT,
      0n,
    )
    await publicClient.waitForTransactionReceipt({ hash: reqHash })
  }, 60_000)

  it('approve reverts after escrow period passes', async () => {
    // Fast-forward past escrow
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    // approve() calls operator.refundInEscrow() which requires escrow to still be active
    // On Anvil, writeContract returns a hash even for reverting txs — check receipt
    const hash = await arbiter.refund!.approve(paymentInfo3, 0n, DEFAULT_AMOUNT)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    expect(receipt.status).toBe('reverted')
  }, 60_000)
})
