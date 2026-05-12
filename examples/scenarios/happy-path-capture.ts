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
// Scenario: Happy Path Capture
// authorize → fast-forward past escrow → capture (2 roles: payer + merchant)
// Asserts real ERC-20 balance deltas: payer ↓ PAYMENT_AMOUNT,
// receiver Δ + fee Δ === PAYMENT_AMOUNT.
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup({ authorize: false })

  const runner = new StepRunner('Happy Path Capture', ctx.publicClient)

  try {
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

    // --- Step 1: Authorize payment (HTTP 402 flow) ---
    runner.step('Authorize payment via HTTP 402 flow')

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

    // --- Step 2: Capture after escrow ---
    runner.step('Capture remaining after escrow expires')
    await ctx.testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await ctx.testClient.mine({ blocks: 1 })

    const captureTx = await ctx.merchant.payment.capture(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
    )
    await runner.waitForTx(captureTx)

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
