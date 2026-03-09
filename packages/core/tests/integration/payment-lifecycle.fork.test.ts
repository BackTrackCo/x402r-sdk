import type { PublicClient, TestClient, WalletClient } from 'viem'
import { erc20Abi, zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  authorize,
  calculateOperatorFeeBps,
  calculateTotalFees,
  getAuthorizationTime,
  getConditionAddress,
  getEscrowAddress,
  getEscrowPeriodDuration,
  getFeeAddresses,
  getOperatorConfig,
  getPaymentAmounts,
  getPaymentState,
  isDuringEscrowPeriod,
  refundInEscrow,
  release,
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
const CHAIN_ID = 84532
const FAR_FUTURE = 281474976710655 // max uint48

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerWallet: WalletClient
let receiverWallet: WalletClient

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  const deployerWallet = anvilBaseSepolia.getWalletClient(
    testRoles.deployer.address,
  )
  testClient = anvilBaseSepolia.getTestClient()

  fixtures = await deployTestFixtures(publicClient, deployerWallet, testClient)

  payerWallet = anvilBaseSepolia.getWalletClient(testRoles.payer.address)
  receiverWallet = anvilBaseSepolia.getWalletClient(testRoles.receiver.address)
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
// Payment State Read Operations
// ---------------------------------------------------------------------------

describe('Payment State Read Operations', () => {
  it('getPaymentState returns default for non-existent payment', async () => {
    const paymentInfo: PaymentInfo = {
      operator: fixtures.operatorAddress,
      payer: testRoles.payer.address,
      receiver: testRoles.receiver.address,
      token: USDC,
      maxAmount: 1_000_000n,
      preApprovalExpiry: FAR_FUTURE,
      authorizationExpiry: FAR_FUTURE,
      refundExpiry: FAR_FUTURE,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: fixtures.operatorAddress,
      salt: 999n,
    }

    const [hasCollected, capturable, refundable] = await getPaymentState(
      publicClient,
      {
        operatorAddress: fixtures.operatorAddress,
        chainId: CHAIN_ID,
        paymentInfo,
      },
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
      preApprovalExpiry: FAR_FUTURE,
      authorizationExpiry: FAR_FUTURE,
      refundExpiry: FAR_FUTURE,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: fixtures.operatorAddress,
      salt: 998n,
    }

    const amounts = await getPaymentAmounts(publicClient, {
      operatorAddress: fixtures.operatorAddress,
      chainId: CHAIN_ID,
      paymentInfo,
    })
    expect(amounts.hasCollectedPayment).toBe(false)
    expect(amounts.capturableAmount).toBe(0n)
    expect(amounts.refundableAmount).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// Payment Lifecycle Write Operations
// ---------------------------------------------------------------------------

// Helper: approve tokenCollector and authorize a payment
async function approveAndAuthorize(
  paymentInfo: PaymentInfo,
  amount: bigint,
): Promise<void> {
  // Payer approves the tokenCollector to pull USDC
  const approveHash = await payerWallet.writeContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'approve',
    args: [baseSepolia.tokenCollector, amount],
    chain: payerWallet.chain,
    account: testRoles.payer.address,
  })
  await publicClient.waitForTransactionReceipt({ hash: approveHash })

  // Authorize the payment via the operator
  const authHash = await authorize(payerWallet, {
    operatorAddress: fixtures.operatorAddress,
    paymentInfo,
    amount,
    tokenCollector: baseSepolia.tokenCollector,
    collectorData: '0x',
  })
  await publicClient.waitForTransactionReceipt({ hash: authHash })
}

describe('Scenario 1: Authorize -> Release after escrow (Flow 1)', () => {
  const AMOUNT = 1_000_000n

  let paymentInfo: PaymentInfo

  beforeAll(() => {
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
  })

  it(
    'authorize creates a capturable payment',
    async () => {
      await approveAndAuthorize(paymentInfo, AMOUNT)

      const [hasCollected, capturable] = await getPaymentState(publicClient, {
        operatorAddress: fixtures.operatorAddress,
        chainId: CHAIN_ID,
        paymentInfo,
      })

      expect(hasCollected).toBe(false)
      expect(capturable).toBeGreaterThan(0n)
    },
    60_000,
  )

  it(
    'release after escrow marks payment as collected',
    async () => {
      // Fast-forward past the 7-day escrow period
      await testClient.increaseTime({ seconds: 604801 })
      await testClient.mine({ blocks: 1 })

      const releaseHash = await release(receiverWallet, {
        operatorAddress: fixtures.operatorAddress,
        paymentInfo,
        amount: AMOUNT,
      })
      await publicClient.waitForTransactionReceipt({ hash: releaseHash })

      const [hasCollected] = await getPaymentState(publicClient, {
        operatorAddress: fixtures.operatorAddress,
        chainId: CHAIN_ID,
        paymentInfo,
      })

      expect(hasCollected).toBe(true)
    },
    60_000,
  )
})

describe('Scenario 2: Escrow period timing', () => {
  const AMOUNT = 1_000_000n

  let paymentInfo: PaymentInfo

  beforeAll(() => {
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
      salt: 2n,
    }
  })

  it(
    'authorization time is recorded and escrow period is active',
    async () => {
      await approveAndAuthorize(paymentInfo, AMOUNT)

      const authTime = await getAuthorizationTime(publicClient, {
        escrowPeriodAddress: fixtures.escrowPeriodAddress,
        paymentInfo,
      })
      expect(authTime).toBeGreaterThan(0n)

      const duringEscrow = await isDuringEscrowPeriod(publicClient, {
        escrowPeriodAddress: fixtures.escrowPeriodAddress,
        paymentInfo,
      })
      expect(duringEscrow).toBe(true)

      const duration = await getEscrowPeriodDuration(publicClient, {
        escrowPeriodAddress: fixtures.escrowPeriodAddress,
      })
      expect(duration).toBe(604800n)
    },
    60_000,
  )

  it(
    'escrow period becomes inactive after fast-forward',
    async () => {
      // Fast-forward past escrow period
      await testClient.increaseTime({ seconds: 604801 })
      await testClient.mine({ blocks: 1 })

      const duringEscrow = await isDuringEscrowPeriod(publicClient, {
        escrowPeriodAddress: fixtures.escrowPeriodAddress,
        paymentInfo,
      })
      expect(duringEscrow).toBe(false)
    },
    60_000,
  )
})

describe('Scenario 3: Partial refund during escrow (Flow 3)', () => {
  const TOTAL_AMOUNT = 1_000_000n
  const REFUND_AMOUNT = 300_000n

  let paymentInfo: PaymentInfo

  beforeAll(() => {
    paymentInfo = {
      operator: fixtures.operatorAddress,
      payer: testRoles.payer.address,
      receiver: testRoles.receiver.address,
      token: USDC,
      maxAmount: TOTAL_AMOUNT,
      preApprovalExpiry: FAR_FUTURE,
      authorizationExpiry: FAR_FUTURE,
      refundExpiry: FAR_FUTURE,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: fixtures.operatorAddress,
      salt: 3n,
    }
  })

  it(
    'partial refundInEscrow reduces capturable amount',
    async () => {
      await approveAndAuthorize(paymentInfo, TOTAL_AMOUNT)

      // Verify initial state — capturable > 0
      const amountsBefore = await getPaymentAmounts(publicClient, {
        operatorAddress: fixtures.operatorAddress,
        chainId: CHAIN_ID,
        paymentInfo,
      })
      expect(amountsBefore.capturableAmount).toBeGreaterThan(0n)

      // Receiver issues partial refund during escrow
      const refundHash = await refundInEscrow(receiverWallet, {
        operatorAddress: fixtures.operatorAddress,
        paymentInfo,
        amount: REFUND_AMOUNT,
      })
      await publicClient.waitForTransactionReceipt({ hash: refundHash })

      // Capturable amount should have decreased
      const amountsAfter = await getPaymentAmounts(publicClient, {
        operatorAddress: fixtures.operatorAddress,
        chainId: CHAIN_ID,
        paymentInfo,
      })
      expect(amountsAfter.capturableAmount).toBeLessThan(
        amountsBefore.capturableAmount,
      )
    },
    60_000,
  )

  it(
    'release remaining amount after escrow completes the payment',
    async () => {
      // Fast-forward past escrow
      await testClient.increaseTime({ seconds: 604801 })
      await testClient.mine({ blocks: 1 })

      // Get the remaining capturable amount
      const amounts = await getPaymentAmounts(publicClient, {
        operatorAddress: fixtures.operatorAddress,
        chainId: CHAIN_ID,
        paymentInfo,
      })
      const remainingAmount = amounts.capturableAmount
      expect(remainingAmount).toBeGreaterThan(0n)

      // Release the remaining amount
      const releaseHash = await release(receiverWallet, {
        operatorAddress: fixtures.operatorAddress,
        paymentInfo,
        amount: remainingAmount,
      })
      await publicClient.waitForTransactionReceipt({ hash: releaseHash })

      // Payment should now be collected
      const finalAmounts = await getPaymentAmounts(publicClient, {
        operatorAddress: fixtures.operatorAddress,
        chainId: CHAIN_ID,
        paymentInfo,
      })
      expect(finalAmounts.hasCollectedPayment).toBe(true)
    },
    60_000,
  )
})
