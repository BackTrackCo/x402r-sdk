import type { PublicClient, TestClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import { x402rChains } from '../../src/config/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { testRoles } from '../setup/constants.js'
import {
  type DeployedFixtures,
  deployTestFixtures,
} from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc
const FAR_FUTURE = 281474976710655

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

const TOTAL_AMOUNT = 1_000_000n
const REFUND_AMOUNT = 300_000n

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
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

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
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 3: Partial refund during escrow
// ---------------------------------------------------------------------------

describe('Scenario 3: Partial refund during escrow', () => {
  it('partial refundInEscrow reduces capturable amount', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const hash = await payerClient.payment.authorize(
      paymentInfo,
      TOTAL_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    // Verify initial state — capturable > 0
    const amountsBefore = await merchant.payment.getAmounts(paymentInfo)
    expect(amountsBefore.capturableAmount).toBeGreaterThan(0n)

    // Receiver issues partial refund during escrow
    const refundHash = await merchant.payment.refundInEscrow(
      paymentInfo,
      REFUND_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash: refundHash })

    // Capturable amount should have decreased
    const amountsAfter = await merchant.payment.getAmounts(paymentInfo)
    expect(amountsAfter.capturableAmount).toBeLessThan(
      amountsBefore.capturableAmount,
    )
  }, 60_000)

  it('release remaining amount after escrow completes the payment', async () => {
    // Fast-forward past escrow
    await testClient.increaseTime({ seconds: 604801 })
    await testClient.mine({ blocks: 1 })

    // Get the remaining capturable amount
    const amounts = await merchant.payment.getAmounts(paymentInfo)
    const remainingAmount = amounts.capturableAmount
    expect(remainingAmount).toBeGreaterThan(0n)

    // Release the remaining amount
    const releaseHash = await merchant.payment.release(
      paymentInfo,
      remainingAmount,
    )
    await publicClient.waitForTransactionReceipt({ hash: releaseHash })

    // Payment should now be collected
    const finalAmounts = await merchant.payment.getAmounts(paymentInfo)
    expect(finalAmounts.hasCollectedPayment).toBe(true)
  }, 60_000)
})
