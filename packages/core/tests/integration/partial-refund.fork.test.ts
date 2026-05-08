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
const MERCHANT_AMOUNT = DEFAULT_AMOUNT - REFUND_AMOUNT

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
// Scenario 3: Partial capture (returns remainder to payer via void)
// ---------------------------------------------------------------------------

// Replaces the old refundInEscrow-based partial-refund scenario. The new
// authCapture surface drops partial in-escrow refunds (`void()` is full-only).
// The recommended replacement (per `.changeset/sdk-authcapture-lift.md`
// migration note) is partial capture — capture only what the merchant keeps,
// then void the remainder back to the payer. Two calls, no allowance, no
// ReceiverRefundCollector.
describe('Scenario 3: Partial capture + void remainder', () => {
  it('partial capture reduces capturable amount, leaves remainder in escrow', async () => {
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

    // Capture is gated by capturePreActionCondition (EscrowPeriod) on the
    // marketplace operator — fast-forward past escrow so the merchant can
    // partially capture.
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const amountsBefore = await merchant.payment.getAmounts(paymentInfo)
    expect(amountsBefore.capturableAmount).toBe(DEFAULT_AMOUNT)

    // Merchant captures only MERCHANT_AMOUNT — the rest stays in escrow
    // (capture is incremental, callable multiple times up to authorized).
    const captureHash = await merchant.payment.capture(
      paymentInfo,
      MERCHANT_AMOUNT,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash: captureHash })

    const amountsAfter = await merchant.payment.getAmounts(paymentInfo)
    expect(amountsAfter.capturableAmount).toBe(REFUND_AMOUNT)
  }, 60_000)

  it('voidPayment returns the remainder to the payer', async () => {
    // Merchant voids the remaining REFUND_AMOUNT back to the payer.
    // voidPayment is full-only — empties whatever's left in capturableAmount.
    const voidHash = await merchant.payment.voidPayment(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash: voidHash })

    const finalAmounts = await merchant.payment.getAmounts(paymentInfo)
    expect(finalAmounts.capturableAmount).toBe(0n)
  }, 60_000)
})
