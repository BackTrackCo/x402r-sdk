import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Freeze Payment ============
  // As an arbiter, freeze a payment to prevent release during investigation.
  // Only the arbiter can freeze — payers check isFrozen() to monitor status.

  if (!ctx.arbiter.freeze) {
    console.log(
      'Freeze module not available — this operator was deployed without freeze support.',
    )
    console.log(
      'To enable: deploy with freezeDurationSeconds > 0 in MarketplaceOperatorOptions.',
    )
  } else {
    // Step 1: Verify not frozen
    const frozenBefore = await ctx.arbiter.freeze.isFrozen(ctx.paymentInfo)
    console.log(`Frozen before: ${frozenBefore}`)

    // Step 2: Arbiter freezes the payment
    const tx = await ctx.arbiter.freeze.freeze(ctx.paymentInfo)
    console.log(`Payment frozen: ${tx}`)

    // Step 3: Verify frozen status
    const frozenAfter = await ctx.arbiter.freeze.isFrozen(ctx.paymentInfo)
    console.log(`Frozen after: ${frozenAfter}`)

    if (!frozenAfter) {
      throw new Error('Payment should be frozen after freeze()')
    }
    console.log('Freeze verified — payment is locked')
  }

  // Payer can check freeze status via their own client (read-only)
  if (ctx.payer.freeze) {
    const payerSeesFrozen = await ctx.payer.freeze.isFrozen(ctx.paymentInfo)
    console.log(`Payer sees frozen: ${payerSeesFrozen}`)
  }
} finally {
  await ctx.cleanup()
}
