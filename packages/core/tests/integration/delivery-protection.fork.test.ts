import type { PublicClient, TestClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type ArbiterClient,
  createArbiterClient,
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, testRoles } from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// Delivery protection escrow: 3 days (259200 seconds) — set in deploy-fixtures.ts
const DELIVERY_ESCROW_FAST_FORWARD = 259201 // 3 days + 1 second

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let arbiterClient: ArbiterClient
let merchant: MerchantClient

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 100n, // distinct from other fork tests
    operator: 'deliveryProtection',
  }))

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.deliveryProtectionOperatorAddress,
    escrowPeriodAddress: fixtures.deliveryProtectionEscrowPeriodAddress,
  })

  arbiterClient = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.deliveryProtectionOperatorAddress,
    escrowPeriodAddress: fixtures.deliveryProtectionEscrowPeriodAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.deliveryProtectionOperatorAddress,
    escrowPeriodAddress: fixtures.deliveryProtectionEscrowPeriodAddress,
  })
}, 60_000)

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
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.hasCollectedPayment).toBe(true)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
  }, 60_000)

  it('arbiter releases funds (no escrow wait required)', async () => {
    // Arbiter can release immediately — releaseCondition is StaticAddressCondition(arbiter),
    // not EscrowPeriod, so no time delay is needed.
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
// Access control: non-arbiter cannot call release()
// ---------------------------------------------------------------------------

describe('Delivery Protection: access control', () => {
  // Use a different salt for a fresh payment
  let accessControlPaymentInfo: PaymentInfo

  beforeAll(async () => {
    accessControlPaymentInfo = { ...paymentInfo, salt: 101n }

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      accessControlPaymentInfo,
    )

    const hash = await payerClient.payment.authorize(
      accessControlPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })
  }, 60_000)

  it('non-arbiter (receiver) cannot call release()', async () => {
    // Merchant (receiver) tries to release — should fail because releaseCondition
    // is StaticAddressCondition(arbiter), and receiver is not the arbiter.
    await expect(
      merchant.payment.release(accessControlPaymentInfo, DEFAULT_AMOUNT),
    ).rejects.toThrow()
  }, 60_000)

  it('non-arbiter (payer) cannot call release()', async () => {
    // Payer tries to release — should also fail
    const payerAsReleaser = createX402r({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: fixtures.deliveryProtectionOperatorAddress,
      escrowPeriodAddress: fixtures.deliveryProtectionEscrowPeriodAddress,
    })

    await expect(
      payerAsReleaser.payment.release(accessControlPaymentInfo, DEFAULT_AMOUNT),
    ).rejects.toThrow()
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Timeout path: authorize → escrow expires → anyone calls refundInEscrow()
// ---------------------------------------------------------------------------

describe('Delivery Protection: timeout auto-refund', () => {
  // Use a different salt for a fresh payment
  let timeoutPaymentInfo: PaymentInfo

  beforeAll(async () => {
    timeoutPaymentInfo = { ...paymentInfo, salt: 102n }

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

  it('refundInEscrow reverts before escrow expires', async () => {
    // Immediately after authorize, escrow is still active — refundInEscrow should fail
    await expect(
      payerClient.payment.refundInEscrow(timeoutPaymentInfo, DEFAULT_AMOUNT),
    ).rejects.toThrow()
  }, 60_000)

  it('refundInEscrow succeeds after escrow expires', async () => {
    // Fast-forward past the 3-day delivery protection escrow period
    await testClient.increaseTime({ seconds: DELIVERY_ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    // Anyone can call refundInEscrow after expiry — using payer here
    const hash = await payerClient.payment.refundInEscrow(
      timeoutPaymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(timeoutPaymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})
