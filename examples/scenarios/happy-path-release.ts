import { setup, signReceiveAuthorization } from '../shared/anvil-setup.js'
import { ESCROW_FAST_FORWARD, PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Happy Path Release
// authorize → charge → release (2 roles: payer + merchant)
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup()

  const runner = new StepRunner('Happy Path Release', ctx.publicClient)

  try {
    // --- Step 1: Authorize payment (HTTP 402 flow) ---
    runner.step('Authorize payment via HTTP 402 flow')

    const payerKey =
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const
    const { getChainConfig } = await import('@x402r/core')
    const chainConfig = getChainConfig(84532)

    const authSig = await signReceiveAuthorization(payerKey, ctx.paymentInfo)
    const authTx = await ctx.merchant.payment.authorize(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      authSig,
    )
    runner.log(`Authorized: ${authTx}`)

    const amounts1 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts1.hasCollectedPayment,
      'Payment collected after authorize',
    )

    // --- Step 2: Charge ---
    runner.step('Merchant charges payment')
    const chargeSig = await signReceiveAuthorization(payerKey, ctx.paymentInfo)
    const chargeTx = await ctx.merchant.payment.charge(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      chargeSig,
    )
    runner.log(`Charged: ${chargeTx}`)

    const amounts2 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts2.hasCollectedPayment,
      'Payment still collected after charge',
    )

    // --- Step 3: Release after escrow ---
    runner.step('Release remaining after escrow expires')
    await ctx.testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await ctx.testClient.mine({ blocks: 1 })

    const releaseTx = await ctx.merchant.payment.release(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
    )
    runner.log(`Released: ${releaseTx}`)

    const amounts3 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts3.capturableAmount === 0n,
      'Capturable amount === 0 after release',
    )

    runner.done()
  } finally {
    await ctx.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
