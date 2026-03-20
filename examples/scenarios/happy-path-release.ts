import { signReceiveAuthorization } from '@x402r/core'
import { privateKeyToAccount } from 'viem/accounts'
import { setup } from '../shared/anvil-setup.js'
import {
  ESCROW_FAST_FORWARD,
  PAYER_PRIVATE_KEY,
  PAYMENT_AMOUNT,
} from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Happy Path Release
// authorize → fast-forward past escrow → release (2 roles: payer + merchant)
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup({ authorize: false })

  const runner = new StepRunner('Happy Path Release', ctx.publicClient)

  try {
    // --- Step 1: Authorize payment (HTTP 402 flow) ---
    runner.step('Authorize payment via HTTP 402 flow')

    const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY)
    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account: payerAccount,
      chainId: 84532,
      paymentInfo: ctx.paymentInfo,
    })
    const authTx = await ctx.merchant.payment.authorize(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await runner.waitForTx(authTx)

    const amounts1 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts1.hasCollectedPayment,
      'Payment collected after authorize',
    )

    // --- Step 2: Release after escrow ---
    runner.step('Release remaining after escrow expires')
    await ctx.testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await ctx.testClient.mine({ blocks: 1 })

    const releaseTx = await ctx.merchant.payment.release(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
    )
    await runner.waitForTx(releaseTx)

    const amounts2 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts2.capturableAmount === 0n,
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
