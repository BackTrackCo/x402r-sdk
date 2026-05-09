import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Freeze Payment ============
  // As a payer, freeze a payment to prevent the merchant from releasing funds
  // during a dispute investigation. Freeze extends escrow time — it's a time
  // extension mechanism, not a permanent lock.
  //
  // On the marketplace operator preset:
  //   - Payer can freeze (filed refund near deadline, needs time extension)
  //   - Arbiter can unfreeze (investigation resolved, can capture early)
  //   - Freeze auto-expires after freezeDuration

  if (!ctx.payer.freeze) {
    throw new Error(
      'Freeze module not available — operator may not have freeze configured.',
    )
  }

  // Step 1: Verify not frozen
  const frozenBefore = await ctx.payer.freeze.isFrozen(ctx.paymentInfo)
  console.log(`Frozen before: ${frozenBefore}`)

  // Step 2: Payer freezes the payment
  const tx = await ctx.payer.freeze.freeze(ctx.paymentInfo)
  await ctx.waitForTx(tx)
  console.log(`Payment frozen: ${tx}`)

  // Step 3: Verify frozen status
  const frozenAfter = await ctx.payer.freeze.isFrozen(ctx.paymentInfo)
  console.log(`Frozen after: ${frozenAfter}`)

  if (!frozenAfter) {
    throw new Error('Payment should be frozen after freeze()')
  }
  console.log('Freeze verified — payment is locked')
} finally {
  await ctx.cleanup()
}
