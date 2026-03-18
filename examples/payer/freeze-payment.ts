import { createX402r } from '@x402r/sdk'
import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Freeze Payment ============
  // As a payer, freeze a payment to prevent the merchant from releasing funds
  // during a dispute investigation.
  //
  // On the marketplace operator preset, the payer can freeze and the merchant
  // can unfreeze. The PayerClient preset only exposes isFrozen() (read-only),
  // so we use createX402r() for the full freeze() action.

  // createX402r() gives full access to all action groups (no role narrowing)
  const payerFull = createX402r({
    publicClient: ctx.publicClient,
    walletClient: ctx.payer.config.walletClient,
    operatorAddress: ctx.operatorAddress,
    freezeAddress: ctx.payer.config.freezeAddress,
    escrowPeriodAddress: ctx.payer.config.escrowPeriodAddress,
  })

  if (!payerFull.freeze) {
    throw new Error(
      'Freeze module not available — operator may not have freeze configured.',
    )
  }

  // Step 1: Verify not frozen
  const frozenBefore = await payerFull.freeze.isFrozen(ctx.paymentInfo)
  console.log(`Frozen before: ${frozenBefore}`)

  // Step 2: Payer freezes the payment
  const tx = await payerFull.freeze.freeze(ctx.paymentInfo)
  await ctx.waitForTx(tx)
  console.log(`Payment frozen: ${tx}`)

  // Step 3: Verify frozen status
  const frozenAfter = await payerFull.freeze.isFrozen(ctx.paymentInfo)
  console.log(`Frozen after: ${frozenAfter}`)

  if (!frozenAfter) {
    throw new Error('Payment should be frozen after freeze()')
  }
  console.log('Freeze verified — payment is locked')

  // Payer can also check via the PayerClient preset (read-only isFrozen)
  if (ctx.payer.freeze) {
    const payerSeesFrozen = await ctx.payer.freeze.isFrozen(ctx.paymentInfo)
    console.log(`PayerClient.isFrozen(): ${payerSeesFrozen}`)
  }
} finally {
  await ctx.cleanup()
}
