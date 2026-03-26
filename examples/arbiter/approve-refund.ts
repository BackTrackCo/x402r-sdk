import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Merchant Executes Refund (via RefundRequest recorder) ============
  // The RefundRequest is now an IRecorder plugin. When the merchant calls
  // refundInEscrow(), the recorder automatically approves the pending request.

  if (!ctx.payer.refund) {
    throw new Error(
      'Refund module not available — check operator configuration',
    )
  }
  if (!ctx.merchant.refund) {
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

  // Step 2: Merchant executes refundInEscrow (recorder approves automatically)
  const tx = await ctx.merchant.payment.refundInEscrow(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
  )
  await ctx.waitForTx(tx)
  console.log(`Refund executed: ${tx}`)

  // Step 3: Verify the approval
  const request = await ctx.merchant.refund.get(ctx.paymentInfo)
  console.log(`Approved amount: ${request.approvedAmount}`)
  console.log(`Status: ${request.status}`)

  if (request.approvedAmount !== ctx.PAYMENT_AMOUNT) {
    throw new Error(
      `Approved amount mismatch: expected ${ctx.PAYMENT_AMOUNT}, got ${request.approvedAmount}`,
    )
  }
  console.log('Refund verified — full amount approved via recorder')
} finally {
  await ctx.cleanup()
}
