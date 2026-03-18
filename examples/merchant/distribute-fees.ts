import { getChainConfig } from '@x402r/core'
import { setup } from '../shared/anvil-setup.js'
import { ESCROW_FAST_FORWARD } from '../shared/constants.js'

const ctx = await setup()

try {
  // ============ Example: Distribute Fees ============
  // As a merchant, distribute accumulated protocol fees after releasing payment.
  // Fees accumulate on the operator when payments are released.

  if (!ctx.merchant.escrow) {
    throw new Error(
      'Escrow module not available — check operator configuration',
    )
  }

  const chainConfig = getChainConfig(84532)

  // Fast-forward past escrow and release to generate fees
  await ctx.testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
  await ctx.testClient.mine({ blocks: 1 })
  await ctx.merchant.payment.release(ctx.paymentInfo, ctx.PAYMENT_AMOUNT)
  console.log('Payment released — fees accumulated')

  // Check accumulated fees
  const accumulatedFees =
    await ctx.merchant.operator.getAccumulatedProtocolFees(chainConfig.usdc)
  console.log(`Accumulated protocol fees: ${accumulatedFees}`)

  if (accumulatedFees === 0n) {
    console.log('No protocol fees to distribute (operator fee may be 0)')
  } else {
    // Distribute fees — this sends accumulated fees to the protocol fee recipient
    const tx = await ctx.merchant.operator.distributeFees(chainConfig.usdc)
    console.log(`Fees distributed: ${tx}`)

    // Verify fees were distributed
    const remainingFees =
      await ctx.merchant.operator.getAccumulatedProtocolFees(chainConfig.usdc)
    console.log(`Remaining fees after distribution: ${remainingFees}`)
  }
} finally {
  await ctx.cleanup()
}
