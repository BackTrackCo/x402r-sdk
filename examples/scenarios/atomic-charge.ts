import { signReceiveAuthorization } from '@x402r/core'
import { erc20Abi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { setup } from '../shared/anvil-setup.js'
import { PAYER_PRIVATE_KEY, PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Atomic Charge
//
// Calls payment.charge() directly — single tx, no escrow hold, no separate
// capture. In production the merchant advertises this intent in
// PaymentRequirements.extra.autoCapture; the facilitator reads that flag and
// dispatches to escrow.charge() vs escrow.authorize() on the merchant's behalf.
// This scenario calls charge() directly to demonstrate the atomic path —
// asserts real token-balance deltas, not just SDK-level invariants that hold
// by construction.
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup({ authorize: false })
  const runner = new StepRunner('Atomic Charge', ctx.publicClient)

  try {
    runner.step('Snapshot pre-charge USDC balances')

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

    runner.step('Atomic charge via payment.charge() — single tx, no escrow')

    const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY)
    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account: payerAccount,
      chainId: 84532,
      paymentInfo: ctx.paymentInfo,
    })

    const chargeTx = await ctx.merchant.payment.charge(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await runner.waitForTx(chargeTx)

    const payerAfter = await readBalance(ctx.paymentInfo.payer)
    const receiverAfter = await readBalance(ctx.paymentInfo.receiver)
    const feeReceiverAfter = await readBalance(ctx.paymentInfo.feeReceiver)

    const payerDelta = payerBefore - payerAfter
    const receiverDelta = receiverAfter - receiverBefore
    const feeDelta = feeReceiverAfter - feeReceiverBefore

    runner.assert(
      payerDelta === PAYMENT_AMOUNT,
      `payer balance ↓ by PAYMENT_AMOUNT (${PAYMENT_AMOUNT}); actual ↓ ${payerDelta}`,
    )
    runner.assert(
      receiverDelta + feeDelta === PAYMENT_AMOUNT,
      `receiver Δ + fee Δ === PAYMENT_AMOUNT; receiver ↑ ${receiverDelta}, fee ↑ ${feeDelta}`,
    )
    runner.assert(
      feeDelta >= 0n,
      `fee receiver delta non-negative (${feeDelta})`,
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
