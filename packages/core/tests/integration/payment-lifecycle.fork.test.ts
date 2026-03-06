import type { PublicClient, TestClient } from 'viem'
import { zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { x402rChains } from '../../src/config/index.js'
import {
  calculateOperatorFeeBps,
  calculateTotalFees,
  getConditionAddress,
  getEscrowAddress,
  getFeeAddresses,
  getOperatorConfig,
  getPaymentAmounts,
  getPaymentState,
} from '../../src/operations/index.js'
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
const CHAIN_ID = 84532

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  const deployerWallet = anvilBaseSepolia.getWalletClient(
    testRoles.deployer.address,
  )
  testClient = anvilBaseSepolia.getTestClient()

  fixtures = await deployTestFixtures(publicClient, deployerWallet, testClient)
}, 60_000)

// ---------------------------------------------------------------------------
// Operator Read Operations
// ---------------------------------------------------------------------------

describe('Operator Read Operations', () => {
  it('getOperatorConfig returns deployed slot addresses', async () => {
    const config = await getOperatorConfig(
      publicClient,
      fixtures.operatorAddress,
    )

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
    const escrow = await getEscrowAddress(
      publicClient,
      fixtures.operatorAddress,
    )
    expect(escrow.toLowerCase()).toBe(
      baseSepolia.authCaptureEscrow.toLowerCase(),
    )
  })

  it('getConditionAddress reads RELEASE_CONDITION', async () => {
    const addr = await getConditionAddress(
      publicClient,
      fixtures.operatorAddress,
      'RELEASE_CONDITION',
    )
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
    preApprovalExpiry: 0,
    authorizationExpiry: 281474976710655,
    refundExpiry: 281474976710655,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: zeroAddress,
    salt: 0n,
  }

  it('getFeeAddresses returns deployed fee addresses', async () => {
    const fees = await getFeeAddresses(publicClient, fixtures.operatorAddress)
    expect(fees.operatorFeeCalculator.toLowerCase()).toBe(
      fixtures.feeCalculatorAddress.toLowerCase(),
    )
    expect(fees.operatorFeeRecipient.toLowerCase()).toBe(
      testRoles.operatorFeeRecipient.address.toLowerCase(),
    )
  })

  it('calculateOperatorFeeBps returns 50 bps', async () => {
    const pi = { ...dummyPaymentInfo, operator: fixtures.operatorAddress }
    const bps = await calculateOperatorFeeBps(
      publicClient,
      fixtures.operatorAddress,
      pi,
      1_000_000n,
      testRoles.payer.address,
    )
    expect(bps).toBe(50n)
  })

  it('calculateTotalFees computes amounts', async () => {
    const pi = { ...dummyPaymentInfo, operator: fixtures.operatorAddress }
    const fees = await calculateTotalFees(
      publicClient,
      fixtures.operatorAddress,
      pi,
      1_000_000n,
      testRoles.payer.address,
    )
    expect(fees.operatorFeeBps).toBe(50n)
    expect(fees.operatorFeeAmount).toBe(5000n) // 1_000_000 * 50 / 10_000
    expect(fees.netAmount).toBe(995000n)
  })
})

// ---------------------------------------------------------------------------
// Payment State (pre-authorize baseline)
// ---------------------------------------------------------------------------

describe('Payment State Read Operations', () => {
  it('getPaymentState returns default for non-existent payment', async () => {
    const paymentInfo: PaymentInfo = {
      operator: fixtures.operatorAddress,
      payer: testRoles.payer.address,
      receiver: testRoles.receiver.address,
      token: USDC,
      maxAmount: 1_000_000n,
      preApprovalExpiry: 0,
      authorizationExpiry: 281474976710655,
      refundExpiry: 281474976710655,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: fixtures.operatorAddress,
      salt: 999n,
    }

    const [hasCollected, capturable, refundable] = await getPaymentState(
      publicClient,
      fixtures.operatorAddress,
      CHAIN_ID,
      paymentInfo,
    )
    expect(hasCollected).toBe(false)
    expect(capturable).toBe(0n)
    expect(refundable).toBe(0n)
  })

  it('getPaymentAmounts returns named object for non-existent payment', async () => {
    const paymentInfo: PaymentInfo = {
      operator: fixtures.operatorAddress,
      payer: testRoles.payer.address,
      receiver: testRoles.receiver.address,
      token: USDC,
      maxAmount: 1_000_000n,
      preApprovalExpiry: 0,
      authorizationExpiry: 281474976710655,
      refundExpiry: 281474976710655,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: fixtures.operatorAddress,
      salt: 998n,
    }

    const amounts = await getPaymentAmounts(
      publicClient,
      fixtures.operatorAddress,
      CHAIN_ID,
      paymentInfo,
    )
    expect(amounts.hasCollectedPayment).toBe(false)
    expect(amounts.capturableAmount).toBe(0n)
    expect(amounts.refundableAmount).toBe(0n)
  })
})
