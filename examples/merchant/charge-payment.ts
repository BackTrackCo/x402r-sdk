import { getChainConfig } from '@x402r/core'
import { setup, signReceiveAuthorization } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Charge Payment ============
  // As a merchant, charge an authorized payment during the escrow period.
  // Requires ERC-3009 collector data for the token transfer.

  const chainConfig = getChainConfig(84532)
  const payerKey =
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const

  const signature = await signReceiveAuthorization(payerKey, ctx.paymentInfo)

  const tx = await ctx.merchant.payment.charge(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
    chainConfig.tokenCollector,
    signature,
  )
  await ctx.waitForTx(tx)
  console.log(`Payment charged: ${tx}`)

  // Verify amounts — after charge, payment has been collected
  const amounts = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
  console.log(`Has collected payment: ${amounts.hasCollectedPayment}`)
  console.log(`Capturable amount: ${amounts.capturableAmount}`)
  console.log(`Refundable amount: ${amounts.refundableAmount}`)

  if (!amounts.hasCollectedPayment) {
    throw new Error('Payment should be collected after charge')
  }
  console.log('Charge verified')
} finally {
  await ctx.cleanup()
}
