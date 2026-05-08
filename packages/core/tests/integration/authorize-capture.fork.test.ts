import type { PublicClient, TestClient } from 'viem'
import { zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import {
  calculateOperatorFeeBps,
  calculateTotalFees,
  getConditionAddress,
  getEscrowAddress,
  getFeeAddresses,
  getOperatorConfig,
} from '../../src/actions/index.js'
import { x402rChains } from '../../src/config/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import {
  DEFAULT_AMOUNT,
  ESCROW_FAST_FORWARD,
  FAR_FUTURE,
  testRoles,
} from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 1n,
  }))

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })
}, 60_000)

// ---------------------------------------------------------------------------
// Operator Read Operations
// ---------------------------------------------------------------------------

describe('Operator Read Operations', () => {
  it('getOperatorConfig returns deployed slot addresses', async () => {
    const config = await getOperatorConfig(publicClient, {
      operatorAddress: fixtures.operatorAddress,
    })

    expect(config.escrow.toLowerCase()).toBe(
      baseSepolia.authCaptureEscrow.toLowerCase(),
    )
    expect(config.feeCalculator.toLowerCase()).toBe(
      fixtures.feeCalculatorAddress.toLowerCase(),
    )
    expect(config.feeReceiver.toLowerCase()).toBe(
      testRoles.operatorFeeRecipient.address.toLowerCase(),
    )
    expect(config.captureCondition.toLowerCase()).toBe(
      fixtures.escrowPeriodAddress.toLowerCase(),
    )
    expect(config.authorizeHook.toLowerCase()).toBe(
      fixtures.escrowPeriodAddress.toLowerCase(),
    )
    // Unset slots should be zero
    expect(config.chargeCondition).toBe(zeroAddress)
    expect(config.chargeHook).toBe(zeroAddress)
    expect(config.voidCondition).toBe(zeroAddress)
  })

  it('getEscrowAddress returns escrow', async () => {
    const escrow = await getEscrowAddress(publicClient, {
      operatorAddress: fixtures.operatorAddress,
    })
    expect(escrow.toLowerCase()).toBe(
      baseSepolia.authCaptureEscrow.toLowerCase(),
    )
  })

  it('getConditionAddress reads CAPTURE_PRE_ACTION_CONDITION', async () => {
    const addr = await getConditionAddress(publicClient, {
      operatorAddress: fixtures.operatorAddress,
      slot: 'CAPTURE_PRE_ACTION_CONDITION',
    })
    expect(addr.toLowerCase()).toBe(fixtures.escrowPeriodAddress.toLowerCase())
  })
})

// ---------------------------------------------------------------------------
// Fee Read Operations
// ---------------------------------------------------------------------------

describe('Fee Read Operations', () => {
  const dummyPaymentInfo: PaymentInfo = {
    operator: zeroAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: 1_000_000n,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: zeroAddress,
    salt: 0n,
  }

  it('getFeeAddresses returns deployed fee addresses', async () => {
    const fees = await getFeeAddresses(publicClient, {
      operatorAddress: fixtures.operatorAddress,
    })
    expect(fees.operatorFeeCalculator.toLowerCase()).toBe(
      fixtures.feeCalculatorAddress.toLowerCase(),
    )
    expect(fees.operatorFeeRecipient.toLowerCase()).toBe(
      testRoles.operatorFeeRecipient.address.toLowerCase(),
    )
  })

  it('calculateOperatorFeeBps returns 50 bps', async () => {
    const pi = { ...dummyPaymentInfo, operator: fixtures.operatorAddress }
    const bps = await calculateOperatorFeeBps(publicClient, {
      operatorAddress: fixtures.operatorAddress,
      paymentInfo: pi,
      amount: 1_000_000n,
      caller: testRoles.payer.address,
    })
    expect(bps).toBe(50n)
  })

  it('calculateTotalFees computes amounts', async () => {
    const pi = { ...dummyPaymentInfo, operator: fixtures.operatorAddress }
    const fees = await calculateTotalFees(publicClient, {
      operatorAddress: fixtures.operatorAddress,
      paymentInfo: pi,
      amount: 1_000_000n,
      caller: testRoles.payer.address,
    })
    expect(fees.operatorFeeBps).toBe(50n)
    expect(fees.operatorFeeAmount).toBe(5000n) // 1_000_000 * 50 / 10_000
    expect(fees.netAmount).toBe(995000n)
  })
})

// ---------------------------------------------------------------------------
// Scenario 1: Authorize -> Capture after escrow
// ---------------------------------------------------------------------------

describe('Scenario 1: Authorize -> Capture after escrow', () => {
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

  it('capture after escrow marks payment as fully captured', async () => {
    // Fast-forward past the 7-day escrow period
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const hash = await merchant.payment.capture(
      paymentInfo,
      DEFAULT_AMOUNT,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.hasCollectedPayment).toBe(true)
    // After capture, capturable should be 0 (funds moved from escrow to receiver)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})
