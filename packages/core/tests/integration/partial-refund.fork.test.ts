import type { PublicClient, TestClient } from 'viem'
import { erc20Abi } from 'viem'
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

// Standard operator's fixture FEE_BPS (see packages/core/tests/setup/deploy-fixtures.ts:47).
// Receiver receives `MERCHANT_AMOUNT * (10_000 - FEE_BPS) / 10_000` after capture
// (operator fee is taken from the captured amount, not added on top).
const FEE_BPS = 50n
const MERCHANT_NET = (MERCHANT_AMOUNT * (10_000n - FEE_BPS)) / 10_000n

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc

let paymentInfo: PaymentInfo
let receiverBalanceBefore: bigint
let payerBalanceBeforeVoid: bigint

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

    // Snapshot receiver balance for token-movement assertion below.
    receiverBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.receiver.address],
    })

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

    // Receiver actually got MERCHANT_NET (= MERCHANT_AMOUNT minus operator fee).
    // capturableAmount delta alone doesn't prove tokens moved; this asserts the
    // on-chain transfer landed in the receiver's wallet.
    const receiverBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.receiver.address],
    })
    expect(receiverBalanceAfter - receiverBalanceBefore).toBe(MERCHANT_NET)
  }, 60_000)

  it('voidPayment returns the remainder to the payer', async () => {
    // Snapshot payer balance for token-movement assertion. voidPayment is
    // full-only and doesn't take fees, so the payer should net REFUND_AMOUNT
    // exactly.
    payerBalanceBeforeVoid = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })

    // Merchant voids the remaining REFUND_AMOUNT back to the payer.
    // voidPayment is full-only — empties whatever's left in capturableAmount.
    const voidHash = await merchant.payment.voidPayment(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash: voidHash })

    const finalAmounts = await merchant.payment.getAmounts(paymentInfo)
    expect(finalAmounts.capturableAmount).toBe(0n)

    // Payer actually got REFUND_AMOUNT back. State assertion above doesn't
    // prove tokens moved; this is the end-to-end guard.
    const payerBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(payerBalanceAfter - payerBalanceBeforeVoid).toBe(REFUND_AMOUNT)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Edge case (b): voidPayment after full capture
// ---------------------------------------------------------------------------

// Pins down on-chain behavior when a merchant calls `voidPayment()` after
// already capturing the full authorized amount (capturableAmount === 0). The
// JSDoc on `voidPayment` (packages/core/src/actions/refund-budget/voidPayment.ts:17-18)
// describes the call as "empties the authorization in one transaction" but
// doesn't specify what happens when there's nothing left to empty. This test
// documents the actual contract behavior so a future contract change can't
// silently change the SDK's surface.
describe('Edge case: voidPayment after full capture', () => {
  it('reverts (or no-ops) when capturableAmount is already 0', async () => {
    // Fresh paymentInfo with salt: 4n to avoid colliding with Scenario 3's
    // salt: 3n (same payer + receiver + asset means salt is the only
    // disambiguator in the escrow nonce).
    const edgePaymentInfo: PaymentInfo = { ...paymentInfo, salt: 4n }
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      edgePaymentInfo,
    )
    const authHash = await payerClient.payment.authorize(
      edgePaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    // Capture the full DEFAULT_AMOUNT so capturableAmount drains to 0.
    const captureHash = await merchant.payment.capture(
      edgePaymentInfo,
      DEFAULT_AMOUNT,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash: captureHash })

    const amounts = await merchant.payment.getAmounts(edgePaymentInfo)
    expect(amounts.capturableAmount).toBe(0n)

    // Observed behavior against the deployed PaymentOperator + EscrowPeriod
    // fixtures: the SDK's `voidPayment()` submits the tx and the wallet client
    // returns a tx hash without throwing (`writeContract` on anvil doesn't
    // simulate before sending). On-chain, the `void()` call REVERTS — see the
    // receipt status below. The capturableAmount stays at 0n (no state
    // change), confirming nothing was double-voided.
    //
    // This pins down the contract-side guarantee: if a future contract
    // version turns the revert into a no-op success, or starts simulating
    // pre-send (so the SDK throws), this test will fail and force a
    // deliberate decision. JSDoc reference: voidPayment.ts:17-18.
    //
    // Snapshot payer balance to prove the reverting void didn't move ERC-20
    // funds. State assertion (capturableAmount === 0n) proves escrow state;
    // this balance assertion proves the token layer is untouched.
    const payerBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })

    const voidHash = await merchant.payment.voidPayment(edgePaymentInfo)
    const voidReceipt = await publicClient.waitForTransactionReceipt({
      hash: voidHash,
    })
    expect(voidReceipt.status).toBe('reverted')

    const amountsAfter = await merchant.payment.getAmounts(edgePaymentInfo)
    expect(amountsAfter.capturableAmount).toBe(0n)

    const payerBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(payerBalanceAfter).toBe(payerBalanceBefore)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Edge case (c): double-application / nonce reuse
// ---------------------------------------------------------------------------

// Depends on the file-level `beforeAll` paymentInfo (salt: 3n) being
// capture+void'd by the preceding `Scenario 3: Partial capture + void
// remainder` describe block. Vitest runs `describe` blocks in file order, so
// by the time this runs, `paymentInfo` has been fully consumed (authorized,
// partial-captured, then voided). Reusing the same paymentInfo here exercises
// the replay-protection boundary: the escrow nonce (see
// `computeEscrowNonce` at packages/core/src/payment/hashing.ts:87-97) is
// derived from `(chainId, escrowAddress, paymentInfo with payer=0)`, so a
// second authorize with the same salt should collide with the already-spent
// nonce and revert.
describe('Edge case: double capture+void on same paymentInfo', () => {
  it('rejects second authorize on the same salt (nonce collision)', async () => {
    // Precondition (in-test guard): Scenario 3 above must have fully consumed
    // paymentInfo (capture + void → capturableAmount === 0n). If this test is
    // run with `--shuffle` or `.only`, the precondition fails fast here rather
    // than confusing the diagnoser with an "expected reverted got success"
    // receipt-status failure downstream.
    const preAmounts = await merchant.payment.getAmounts(paymentInfo)
    expect(preAmounts.capturableAmount).toBe(0n)

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )

    // Observed behavior: the SDK's `authorize()` submits the tx and returns a
    // hash without throwing (no pre-send simulation). The on-chain
    // `authorize()` REVERTS in the receipt — the escrow nonce (see
    // `computeEscrowNonce` at packages/core/src/payment/hashing.ts:87-97) is
    // already consumed by Scenario 3's capture+void, and ERC-3009 nonces are
    // single-use, so the second authorize cannot pull tokens. The
    // capturableAmount stays at 0n.
    //
    // This is the replay-protection boundary: if a future contract version
    // ever lets this succeed, a malicious or buggy caller could re-collect
    // tokens against a paymentInfo the payer thought was fully consumed.
    //
    // Snapshot payer balance to prove the reverting authorize didn't pull
    // any tokens at the ERC-20 layer. State assertion (capturableAmount === 0n)
    // proves escrow state; this balance assertion proves no funds moved.
    const payerBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })

    const replayHash = await payerClient.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    const replayReceipt = await publicClient.waitForTransactionReceipt({
      hash: replayHash,
    })
    expect(replayReceipt.status).toBe('reverted')

    const amountsAfter = await merchant.payment.getAmounts(paymentInfo)
    expect(amountsAfter.capturableAmount).toBe(0n)

    const payerBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(payerBalanceAfter).toBe(payerBalanceBefore)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Edge case (d): capture overspend — capture(amount > capturableAmount)
// ---------------------------------------------------------------------------

// Pins down on-chain behavior when a merchant tries to capture MORE than the
// authorized capturableAmount (e.g., off-by-one in their amount math, or a
// stale read of capturableAmount before another capture drained it). The SDK
// path (`packages/core/src/actions/payment/capture.ts:17-34`) wraps
// `writeContract` with no client-side amount validation, so the behavior is
// purely contract-defined.
describe('Edge case: capture overspend (amount > capturableAmount)', () => {
  it('reverts and leaves capturableAmount unchanged', async () => {
    // Fresh paymentInfo with salt: 5n to avoid colliding with Scenarios above.
    const overspendInfo: PaymentInfo = { ...paymentInfo, salt: 5n }
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      overspendInfo,
    )
    const authHash = await payerClient.payment.authorize(
      overspendInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const amountsBefore = await merchant.payment.getAmounts(overspendInfo)
    expect(amountsBefore.capturableAmount).toBe(DEFAULT_AMOUNT)

    // Snapshot receiver USDC balance — if the overspend silently let an
    // out-of-range amount through, receiver tokens would move.
    const receiverBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.receiver.address],
    })

    // Attempt to capture MORE than authorized. SDK returns a tx hash (no
    // pre-simulation), on-chain reverts at receipt level (same pattern as
    // edge cases (b) and (c)).
    const overspendHash = await merchant.payment.capture(
      overspendInfo,
      DEFAULT_AMOUNT + 1n,
      '0x',
    )
    const overspendReceipt = await publicClient.waitForTransactionReceipt({
      hash: overspendHash,
    })
    expect(overspendReceipt.status).toBe('reverted')

    // State invariants: capturableAmount unchanged, receiver tokens didn't
    // move. Together these prove the contract gate held.
    const amountsAfter = await merchant.payment.getAmounts(overspendInfo)
    expect(amountsAfter.capturableAmount).toBe(DEFAULT_AMOUNT)

    const receiverBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.receiver.address],
    })
    expect(receiverBalanceAfter).toBe(receiverBalanceBefore)
  }, 60_000)
})
