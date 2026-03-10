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
import { testRoles } from '../setup/constants.js'
import {
  type DeployedFixtures,
  deployTestFixtures,
} from '../setup/deploy-fixtures.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc
const FAR_FUTURE = 281474976710655 // max uint48

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

const AMOUNT = 1_000_000n

let paymentInfo: PaymentInfo

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  testClient = anvilBaseSepolia.getTestClient()
  const deployerWallet = anvilBaseSepolia.getWalletClient(
    testRoles.deployer.address,
  )

  fixtures = await deployTestFixtures(publicClient, deployerWallet, testClient)

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  paymentInfo = {
    operator: fixtures.operatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: fixtures.operatorAddress,
    salt: 1n,
  }
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
    expect(config.feeRecipient.toLowerCase()).toBe(
      testRoles.operatorFeeRecipient.address.toLowerCase(),
    )
    expect(config.releaseCondition.toLowerCase()).toBe(
      fixtures.escrowPeriodAddress.toLowerCase(),
    )
    expect(config.authorizeRecorder.toLowerCase()).toBe(
      fixtures.escrowPeriodAddress.toLowerCase(),
    )
    // Unset slots should be zero
    expect(config.chargeCondition).toBe(zeroAddress)
    expect(config.chargeRecorder).toBe(zeroAddress)
    expect(config.refundInEscrowCondition).toBe(zeroAddress)
  })

  it('getEscrowAddress returns escrow', async () => {
    const escrow = await getEscrowAddress(publicClient, {
      operatorAddress: fixtures.operatorAddress,
    })
    expect(escrow.toLowerCase()).toBe(
      baseSepolia.authCaptureEscrow.toLowerCase(),
    )
  })

  it('getConditionAddress reads RELEASE_CONDITION', async () => {
    const addr = await getConditionAddress(publicClient, {
      operatorAddress: fixtures.operatorAddress,
      slot: 'RELEASE_CONDITION',
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
// Scenario 1: Authorize -> Release after escrow
// ---------------------------------------------------------------------------

describe('Scenario 1: Authorize -> Release after escrow', () => {
  it('authorize creates a capturable payment', async () => {
    const hash = await payerClient.payment.approveAndAuthorize(
      paymentInfo,
      AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    // hasCollectedPayment = true means tokens collected from payer into escrow
    expect(amounts.hasCollectedPayment).toBe(true)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
  }, 60_000)

  it('release after escrow marks payment as collected', async () => {
    // Fast-forward past the 7-day escrow period
    await testClient.increaseTime({ seconds: 604801 })
    await testClient.mine({ blocks: 1 })

    const hash = await merchant.payment.release(paymentInfo, AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.hasCollectedPayment).toBe(true)
    // After release, capturable should be 0 (funds released from escrow)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})
