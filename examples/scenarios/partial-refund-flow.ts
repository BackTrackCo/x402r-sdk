import { signReceiveAuthorization } from '@x402r/core'
import { erc20Abi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { setup } from '../shared/anvil-setup.js'
import {
  ESCROW_FAST_FORWARD,
  PAYER_PRIVATE_KEY,
  PAYMENT_AMOUNT,
} from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Partial Refund Flow
//
// The new auth-capture partial-refund pattern: capture(merchantKeep) then
// voidPayment() returns the remainder to the payer. Replaces the old
// single-tx refundInEscrow(amount) — two transactions, no allowance setup,
// no ReceiverRefundCollector. Asserts real balance deltas: payer recovers
// the remainder, receiver gets merchantKeep minus fee.
// ---------------------------------------------------------------------------

const MERCHANT_KEEP = (PAYMENT_AMOUNT * 60n) / 100n // 60% kept by merchant

async function main() {
  const ctx = await setup({ authorize: false })
  const runner = new StepRunner('Partial Refund Flow', ctx.publicClient)

  try {
    runner.step('Authorize payment via SDK viem flow')

    const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY)
    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account: payerAccount,
      chainId: 84532,
      paymentInfo: ctx.paymentInfo,
    })
    const authTx = await ctx.merchant.payment.authorize(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await runner.waitForTx(authTx)

    runner.step('Fast-forward past escrow period')
    await ctx.testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await ctx.testClient.mine({ blocks: 1 })

    runner.step('Snapshot pre-capture USDC balances')

    const readBalance = (owner: `0x${string}`) =>
      ctx.publicClient.readContract({
        address: ctx.paymentInfo.token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })

    const payerBefore = await readBalance(ctx.paymentInfo.payer)
    const receiverBefore = await readBalance(ctx.paymentInfo.receiver)
    const feeReceiverBefore = await readBalance(ctx.paymentInfo.feeReceiver)

    // If the second tx fails (crash, gas exhaustion, key loss), payer
    // recovers the remainder via AuthCaptureEscrow.reclaim() once
    // paymentInfo.refundExpiry has passed. See MIGRATION.md.
    runner.step(`Capture merchant keep (${MERCHANT_KEEP} of ${PAYMENT_AMOUNT})`)
    const captureTx = await ctx.merchant.payment.capture(
      ctx.paymentInfo,
      MERCHANT_KEEP,
    )
    await runner.waitForTx(captureTx)

    runner.step('Void remainder back to payer')
    const voidTx = await ctx.merchant.payment.voidPayment(ctx.paymentInfo)
    await runner.waitForTx(voidTx)

    const payerAfter = await readBalance(ctx.paymentInfo.payer)
    const receiverAfter = await readBalance(ctx.paymentInfo.receiver)
    const feeReceiverAfter = await readBalance(ctx.paymentInfo.feeReceiver)

    const payerRecovered = payerAfter - payerBefore
    const receiverDelta = receiverAfter - receiverBefore
    const feeDelta = feeReceiverAfter - feeReceiverBefore
    const expectedRemainder = PAYMENT_AMOUNT - MERCHANT_KEEP

    // Balances were snapshotted after authorize() pulled PAYMENT_AMOUNT into
    // escrow. During capture + void: capture moves MERCHANT_KEEP out (to
    // receiver + fee), and void returns the remainder to the payer.
    runner.assert(
      payerRecovered === expectedRemainder,
      `payer recovered remainder (${expectedRemainder}); actual ${payerRecovered}`,
    )
    // Receiver + fee receiver together split the merchant-keep amount.
    runner.assert(
      receiverDelta + feeDelta === MERCHANT_KEEP,
      `receiver Δ + fee Δ === MERCHANT_KEEP; receiver ↑ ${receiverDelta}, fee ↑ ${feeDelta}`,
    )
    runner.assert(
      feeDelta > 0n,
      `fee receiver delta strictly positive (${feeDelta})`,
    )

    runner.done()
  } finally {
    await ctx.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
