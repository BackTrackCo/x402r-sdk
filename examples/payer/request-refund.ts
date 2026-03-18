import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Request Refund ============
  // As a payer, request a refund for a payment in escrow.
  // The payer's refund module must be available (operator deployed with RefundRequest).

  if (!ctx.payer.refund) {
    throw new Error(
      'Refund module not available — check operator configuration',
    )
  }

  const tx = await ctx.payer.refund.request(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
    0n,
  )
  console.log(`Refund requested: ${tx}`)

  const status = await ctx.payer.refund.getStatus(ctx.paymentInfo, 0n)
  console.log(`Refund status: ${status} (0 = Pending)`)

  const request = await ctx.payer.refund.get(ctx.paymentInfo, 0n)
  console.log(`Requested amount: ${request.amount}`)
  console.log(`Nonce: ${request.nonce}`)
} finally {
  await ctx.cleanup()
}
