import type { PublicClient, TestClient } from 'viem'
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
import { refuseRefundRequest } from '../../src/actions/index.js'
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

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 5n,
  }))

  facilitator = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  payer = createPayerClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  arbiter = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.operatorAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
  })
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 5: Payer requests refund, arbiter denies, merchant releases (Flow 6)
// ---------------------------------------------------------------------------

describe('Scenario 5: Deny refund request', () => {
  it('authorize creates a capturable payment', async () => {
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
  }, 60_000)

  it('payer requests refund', async () => {
    const hash = await payer.refund!.request(paymentInfo, DEFAULT_AMOUNT, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const hasRequest = await arbiter.refund!.has(paymentInfo, 0n)
    expect(hasRequest).toBe(true)
  }, 60_000)

  it('arbiter denies the refund request', async () => {
    const hash = await arbiter.refund!.deny(paymentInfo, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo, 0n)
    // Denied = 2 in RefundRequestStatus enum
    expect(status).toBe(2)
  }, 60_000)

  it('payment state is unchanged after denial', async () => {
    const amounts = await payer.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
    expect(amounts.hasCollectedPayment).toBe(true)
  }, 60_000)

  it('merchant can release after deny + escrow period passes (Flow 6 completion)', async () => {
    // Fast-forward past the 7-day escrow period
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const hash = await merchant.payment.release(paymentInfo, DEFAULT_AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
    expect(amounts.hasCollectedPayment).toBe(true)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Scenario 5a-neg: approve() reverts after deny on gated operator
// ---------------------------------------------------------------------------

describe('Scenario 5a-neg: Approve reverts after deny', () => {
  let gatedPaymentInfo: PaymentInfo
  let gatedFacilitator: X402r
  let gatedPayer: PayerClient
  let gatedArbiter: ArbiterClient

  beforeAll(async () => {
    // Use arbiterRefund operator — gated by StaticAddressCondition(refundRequest)
    const gatedScenario = await setupScenario({
      salt: 6n,
      operator: 'arbiterRefund',
    })
    gatedPaymentInfo = gatedScenario.paymentInfo

    gatedFacilitator = createX402r({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: fixtures.escrowPeriodAddress,
    })

    gatedPayer = createPayerClient({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      refundRequestAddress: fixtures.refundRequestAddress,
    })

    gatedArbiter = createArbiterClient({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      refundRequestAddress: fixtures.refundRequestAddress,
    })
  }, 60_000)

  it('authorize + payer requests refund', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      gatedPaymentInfo,
    )
    const hash = await gatedFacilitator.payment.authorize(
      gatedPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const reqHash = await gatedPayer.refund!.request(
      gatedPaymentInfo,
      DEFAULT_AMOUNT,
      0n,
    )
    await publicClient.waitForTransactionReceipt({ hash: reqHash })
  }, 60_000)

  it('arbiter denies the refund request', async () => {
    const hash = await gatedArbiter.refund!.deny(gatedPaymentInfo, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await gatedArbiter.refund!.getStatus(gatedPaymentInfo, 0n)
    expect(status).toBe(2) // Denied
  }, 60_000)

  it('approve() reverts after deny (RequestNotApprovable)', async () => {
    // approve() should revert because the request is already Denied
    const hash = await gatedArbiter.refund!.approve(
      gatedPaymentInfo,
      0n,
      DEFAULT_AMOUNT,
    )
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    expect(receipt.status).toBe('reverted')
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Scenario 5b: Arbiter refuses refund request
// ---------------------------------------------------------------------------

describe('Scenario 5b: Refuse refund request', () => {
  it('payer requests another refund (nonce 1)', async () => {
    const hash = await payer.refund!.request(paymentInfo, DEFAULT_AMOUNT, 1n)
    await publicClient.waitForTransactionReceipt({ hash })

    const hasRequest = await arbiter.refund!.has(paymentInfo, 1n)
    expect(hasRequest).toBe(true)
  }, 60_000)

  it('arbiter refuses the refund request (status = Refused)', async () => {
    // refuse() is onlyArbiter in the contract — call via core action with arbiter wallet
    const hash = await refuseRefundRequest(
      anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
      {
        contractAddress: fixtures.refundRequestAddress,
        paymentInfo,
        nonce: 1n,
      },
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo, 1n)
    // Refused = 4 in RefundRequestStatus enum
    expect(status).toBe(4)
  }, 60_000)
})
