import { signReceiveAuthorization } from '@x402r/core'
import { x402rDefaults } from '@x402r/helpers'
import { privateKeyToAccount } from 'viem/accounts'
import { setup } from '../shared/anvil-setup.js'
import { PAYER_PRIVATE_KEY, PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Atomic Charge (autoCapture)
//
// Demonstrates the autoCapture wire-format flag. When a merchant signals
// `extra.autoCapture: true` in the 402 challenge, the facilitator calls
// AuthCaptureEscrow.charge() instead of authorize() — funds go straight
// from payer to receiver in one tx, no escrow hold, no separate capture.
//
// In this scenario the merchant acts as their own facilitator (no separate
// facilitator process), so the dispatch happens inline: build an `extra`
// with autoCapture: true via x402rDefaults() to document merchant intent,
// then call payment.charge() directly. The `extra` is decorative here — a
// real x402-resource-server would put it in the PaymentRequirements body
// and the facilitator would read it to choose charge vs authorize.
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup({ authorize: false })
  const runner = new StepRunner('Atomic Charge (autoCapture)', ctx.publicClient)

  try {
    // Demonstrative: wire-format `extra` a merchant would put in their 402
    // challenge to opt into atomic charge. Sourced from the underlying
    // PaymentInfo so the demo stays consistent with the rest of the setup.
    const extra = x402rDefaults({
      captureAuthorizer: ctx.paymentInfo.operator,
      captureDeadline: ctx.paymentInfo.authorizationExpiry,
      refundDeadline: ctx.paymentInfo.refundExpiry,
      feeRecipient: ctx.paymentInfo.feeReceiver,
      minFeeBps: ctx.paymentInfo.minFeeBps,
      maxFeeBps: ctx.paymentInfo.maxFeeBps,
      name: 'USDC',
      version: '2',
      autoCapture: true,
    })
    runner.step(`Wire-format extra signals autoCapture=${extra.autoCapture}`)

    runner.step('Atomic charge via payment.charge() — single tx, no escrow')

    const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY)
    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account: payerAccount,
      chainId: 84532,
      paymentInfo: ctx.paymentInfo,
    })

    const chargeTx = await ctx.merchant.payment.charge(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await runner.waitForTx(chargeTx)

    const amounts = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts.capturableAmount === 0n,
      'capturableAmount === 0 immediately (no escrow hold)',
    )
    runner.assert(
      amounts.hasCollectedPayment,
      'hasCollectedPayment === true after single-tx charge',
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
