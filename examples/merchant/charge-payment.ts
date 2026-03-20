import { signReceiveAuthorization } from '@x402r/helpers'
import { privateKeyToAccount } from 'viem/accounts'
import { setup } from '../shared/anvil-setup.js'
import { PAYER_PRIVATE_KEY } from '../shared/constants.js'

const ctx = await setup({ authorize: false })

try {
  // ============ Example: Charge Payment ============
  // Direct charge — collects tokens and immediately distributes to receiver.
  // No escrow hold. Requires ERC-3009 collector data for the token transfer.

  const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY)
  const { collectorData, tokenCollector } = await signReceiveAuthorization({
    account: payerAccount,
    chainId: 84532,
    paymentInfo: ctx.paymentInfo,
  })

  const tx = await ctx.merchant.payment.charge(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
    tokenCollector,
    collectorData,
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
