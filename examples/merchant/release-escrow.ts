import { setup } from '../shared/anvil-setup.js'
import { ESCROW_FAST_FORWARD } from '../shared/constants.js'

const ctx = await setup()

try {
  // ============ Example: Release Escrow ============
  // As a merchant, release remaining funds after the escrow period expires.
  // Uses testClient.increaseTime() to fast-forward past escrow.

  if (!ctx.merchant.escrow) {
    throw new Error(
      'Escrow module not available — check operator configuration',
    )
  }

  // Verify we're still in escrow
  const duringEscrow = await ctx.merchant.escrow.isDuringEscrow(ctx.paymentInfo)
  console.log(`During escrow: ${duringEscrow}`)

  // Fast-forward past escrow period (7 days + 1 second)
  await ctx.testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
  await ctx.testClient.mine({ blocks: 1 })

  // Verify escrow has expired
  const afterEscrow = await ctx.merchant.escrow.isDuringEscrow(ctx.paymentInfo)
  console.log(`During escrow after fast-forward: ${afterEscrow}`)

  // Release remaining authorized funds
  const tx = await ctx.merchant.payment.capture(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
  )
  await ctx.waitForTx(tx)
  console.log(`Escrow released: ${tx}`)

  // Verify final amounts — after release, capturable should be 0
  const amounts = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
  console.log(`Capturable amount: ${amounts.capturableAmount}`)
  console.log(`Refundable amount: ${amounts.refundableAmount}`)

  if (amounts.capturableAmount !== 0n) {
    throw new Error(
      `Capturable should be 0 after full release, got ${amounts.capturableAmount}`,
    )
  }
  console.log('Release verified')
} finally {
  await ctx.cleanup()
}
