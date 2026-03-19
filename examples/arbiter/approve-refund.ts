import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Approve Refund ============
  // As an arbiter, approve a payer's refund request.
  // The arbiter reviews the request and approves for the full or partial amount.

  if (!ctx.payer.refund) {
    throw new Error(
      'Refund module not available — check operator configuration',
    )
  }
  if (!ctx.arbiter.refund) {
    throw new Error(
      'Refund module not available — check operator configuration',
    )
  }

  // Step 1: Payer requests a refund
  const reqTx = await ctx.payer.refund.request(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
    0n,
  )
  await ctx.waitForTx(reqTx)
  console.log('Payer requested refund')

  // Step 2: Arbiter reviews and approves
  const tx = await ctx.arbiter.refund.approve(
    ctx.paymentInfo,
    0n,
    ctx.PAYMENT_AMOUNT,
  )
  await ctx.waitForTx(tx)
  console.log(`Refund approved: ${tx}`)

  // Step 3: Verify the approval
  const request = await ctx.arbiter.refund.get(ctx.paymentInfo, 0n)
  console.log(`Approved amount: ${request.approvedAmount}`)
  console.log(`Status: ${request.status}`)

  if (request.approvedAmount !== ctx.PAYMENT_AMOUNT) {
    throw new Error(
      `Approved amount mismatch: expected ${ctx.PAYMENT_AMOUNT}, got ${request.approvedAmount}`,
    )
  }
  console.log('Approval verified — full amount approved')
} finally {
  await ctx.cleanup()
}
