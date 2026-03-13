import type { PublicClient, TestClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
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
let payerClient: X402r
let merchant: MerchantClient

const REFUND_AMOUNT = 300_000n

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 3n,
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
      DEFAULT_AMOUNT,
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
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
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
