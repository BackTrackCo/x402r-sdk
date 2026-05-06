import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Approve Refund ============
  // Whoever is authorized by the operator's voidCondition can call
  // voidPayment(). The RefundRequest hook auto-approves the pending request.
  // The condition could be ReceiverCondition, StaticAddressCondition(arbiter), etc.

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
  )
  await ctx.waitForTx(reqTx)
  console.log('Payer requested refund')

  // Step 2: Authorized party calls voidPayment (the RefundRequest hook approves
  // the request automatically). voidPayment empties the entire authorization
  // in one shot — escrow.void is full-only. Here the arbiter is the authorized
  // caller; depends on operator condition setup.
  const tx = await ctx.arbiter.payment.voidPayment(ctx.paymentInfo)
  await ctx.waitForTx(tx)
  console.log(`Refund approved: ${tx}`)

  // Step 3: Verify the approval
  const request = await ctx.arbiter.refund.get(ctx.paymentInfo)
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
