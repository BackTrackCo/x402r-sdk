import { getChainConfig } from '@x402r/core'
import { erc20Abi } from 'viem'
import { setup, signReceiveAuthorization } from '../shared/anvil-setup.js'
import { PAYER_PRIVATE_KEY, PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Dispute Resolution (3-role full lifecycle)
//
// Flow: authorize → charge → payer requests refund → payer + merchant submit
//       evidence → arbiter reviews evidence → arbiter approves refund →
//       verify refund amounts → merchant distributes fees
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup({ authorize: false })

  const runner = new StepRunner('Dispute Resolution', ctx.publicClient)

  try {
    // Runtime guards
    if (!ctx.payer.refund) throw new Error('Payer refund module unavailable')
    if (!ctx.arbiter.refund)
      throw new Error('Arbiter refund module unavailable')
    if (!ctx.merchant.escrow)
      throw new Error('Merchant escrow module unavailable')
    if (
      !ctx.payer.evidence ||
      !ctx.merchant.evidence ||
      !ctx.arbiter.evidence
    ) {
      throw new Error('Evidence module not available')
    }

    const chainConfig = getChainConfig(84532)

    // ================================================================
    // Step 1: Authorize payment (HTTP 402 flow)
    // ================================================================
    runner.step('Authorize payment via HTTP 402 flow')

    const authSig = await signReceiveAuthorization(
      PAYER_PRIVATE_KEY,
      ctx.paymentInfo,
    )
    const authTx = await ctx.merchant.payment.authorize(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      authSig,
    )
    await runner.waitForTx(authTx)

    const amounts1 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts1.hasCollectedPayment,
      'Payment collected after authorize',
    )
    runner.assert(
      amounts1.capturableAmount === PAYMENT_AMOUNT,
      `Capturable === ${PAYMENT_AMOUNT}`,
    )

    // ================================================================
    // Step 2: Merchant charges payment
    // ================================================================
    runner.step('Merchant charges payment')

    const chargeSig = await signReceiveAuthorization(
      PAYER_PRIVATE_KEY,
      ctx.paymentInfo,
    )
    const chargeTx = await ctx.merchant.payment.charge(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      chargeSig,
    )
    await runner.waitForTx(chargeTx)

    const amounts2 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts2.hasCollectedPayment,
      'Payment still collected after charge',
    )

    // ================================================================
    // Step 3: Payer requests refund
    // ================================================================
    runner.step('Payer requests refund')

    const requestTx = await ctx.payer.refund.request(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      0n,
    )
    await runner.waitForTx(requestTx)

    const refundRequest = await ctx.payer.refund.get(ctx.paymentInfo, 0n)
    runner.assert(
      refundRequest.amount === PAYMENT_AMOUNT,
      `Refund request amount === ${PAYMENT_AMOUNT}`,
    )
    runner.log(`Refund status: ${refundRequest.status} (Pending)`)

    // ================================================================
    // Step 4: Evidence submission (payer + merchant)
    // ================================================================
    runner.step('Submit evidence (payer + merchant)')

    const payerEvTx = await ctx.payer.evidence.submit(
      ctx.paymentInfo,
      0n,
      'QmPayerEvidence_receipt',
    )
    await runner.waitForTx(payerEvTx)
    const payerEntry = await ctx.payer.evidence.get(ctx.paymentInfo, 0n, 0n)
    runner.assert(
      payerEntry.submitter.toLowerCase() === ctx.accounts.payer.toLowerCase(),
      `Evidence submitter matches payer (${ctx.accounts.payer})`,
    )

    const merchantEvTx = await ctx.merchant.evidence.submit(
      ctx.paymentInfo,
      0n,
      'QmMerchantEvidence_delivery',
    )
    await runner.waitForTx(merchantEvTx)
    const merchantEntry = await ctx.merchant.evidence.get(
      ctx.paymentInfo,
      0n,
      1n,
    )
    runner.assert(
      merchantEntry.submitter.toLowerCase() ===
        ctx.accounts.merchant.toLowerCase(),
      `Evidence submitter matches merchant (${ctx.accounts.merchant})`,
    )

    // ================================================================
    // Step 5: Arbiter reviews evidence
    // ================================================================
    runner.step('Arbiter reviews evidence')

    const evidenceCount = await ctx.arbiter.evidence.count(ctx.paymentInfo, 0n)
    runner.assert(evidenceCount === 2n, 'Evidence count === 2')

    const batch = await ctx.arbiter.evidence.getBatch(
      ctx.paymentInfo,
      0n,
      0n,
      evidenceCount,
    )
    runner.log(`Evidence entries: ${batch.entries.length}`)
    for (const entry of batch.entries) {
      runner.log(`  CID: ${entry.cid} from ${entry.submitter}`)
    }

    // ================================================================
    // Step 6: Arbiter approves refund
    // ================================================================
    runner.step('Arbiter approves refund for full amount')

    const approveTx = await ctx.arbiter.refund.approve(
      ctx.paymentInfo,
      0n,
      PAYMENT_AMOUNT,
    )
    await runner.waitForTx(approveTx)

    const approvedRequest = await ctx.arbiter.refund.get(ctx.paymentInfo, 0n)
    runner.assert(
      approvedRequest.approvedAmount === PAYMENT_AMOUNT,
      `Approved amount === ${PAYMENT_AMOUNT}`,
    )
    runner.assert(
      approvedRequest.status === 1,
      'Refund status === Approved (1)',
    )

    // ================================================================
    // Step 7: Verify refund amounts
    // ================================================================
    runner.step('Verify refund amounts on operator')

    const amounts3 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts3.refundableAmount === 0n,
      'Refundable amount === 0 after refund executed',
    )

    const payerUsdcBalance = await ctx.publicClient.readContract({
      address: ctx.paymentInfo.token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [ctx.accounts.payer],
    })
    runner.log(`Payer USDC balance: ${payerUsdcBalance}`)

    // ================================================================
    // Step 8: Distribute fees
    // ================================================================
    runner.step('Merchant distributes protocol fees')

    const accumulatedFees =
      await ctx.merchant.operator.getAccumulatedProtocolFees(
        ctx.paymentInfo.token,
      )
    runner.log(`Accumulated protocol fees: ${accumulatedFees}`)

    if (accumulatedFees > 0n) {
      const feeTx = await ctx.merchant.operator.distributeFees(
        ctx.paymentInfo.token,
      )
      await runner.waitForTx(feeTx)

      const remainingFees =
        await ctx.merchant.operator.getAccumulatedProtocolFees(
          ctx.paymentInfo.token,
        )
      runner.assert(remainingFees === 0n, 'All protocol fees distributed')
    } else {
      runner.log('No fees to distribute (refund returned all funds)')
    }

    runner.done()
  } finally {
    await ctx.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
