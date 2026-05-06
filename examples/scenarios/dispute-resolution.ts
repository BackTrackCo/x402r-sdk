import { signReceiveAuthorization } from '@x402r/core'
import { erc20Abi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { setup } from '../shared/anvil-setup.js'
import { PAYER_PRIVATE_KEY, PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Dispute Resolution (3-role full lifecycle)
//
// Flow: authorize → payer requests refund → payer + merchant submit evidence →
//       arbiter reviews evidence → merchant executes voidPayment
//       (hook approves automatically) → verify refund amounts →
//       merchant distributes fees
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup({ authorize: false })

  const runner = new StepRunner('Dispute Resolution', ctx.publicClient)

  try {
    // Runtime guards
    if (!ctx.payer.refund) throw new Error('Payer refund module unavailable')
    if (!ctx.merchant.refund)
      throw new Error('Merchant refund module unavailable')
    if (!ctx.merchant.escrow)
      throw new Error('Merchant escrow module unavailable')
    if (
      !ctx.payer.evidence ||
      !ctx.merchant.evidence ||
      !ctx.arbiter.evidence
    ) {
      throw new Error('Evidence module not available')
    }

    // ================================================================
    // Step 1: Authorize payment (HTTP 402 flow)
    // ================================================================
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
    runner.assert(
      amounts1.capturableAmount === PAYMENT_AMOUNT,
      `Capturable === ${PAYMENT_AMOUNT}`,
    )

    // ================================================================
    // Step 2: Payer requests refund
    // ================================================================
    runner.step('Payer requests refund')

    const requestTx = await ctx.payer.refund.request(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
    )
    await runner.waitForTx(requestTx)

    const refundRequest = await ctx.payer.refund.get(ctx.paymentInfo)
    runner.assert(
      refundRequest.amount === PAYMENT_AMOUNT,
      `Refund request amount === ${PAYMENT_AMOUNT}`,
    )
    runner.log(`Refund status: ${refundRequest.status} (Pending)`)

    // ================================================================
    // Step 3: Evidence submission (payer + merchant)
    // ================================================================
    runner.step('Submit evidence (payer + merchant)')

    const payerEvTx = await ctx.payer.evidence.submit(
      ctx.paymentInfo,
      'QmPayerEvidence_receipt',
    )
    await runner.waitForTx(payerEvTx)
    const payerEntry = await ctx.payer.evidence.get(ctx.paymentInfo, 0n)
    runner.assert(
      payerEntry.submitter.toLowerCase() === ctx.accounts.payer.toLowerCase(),
      `Evidence submitter matches payer (${ctx.accounts.payer})`,
    )

    const merchantEvTx = await ctx.merchant.evidence.submit(
      ctx.paymentInfo,
      'QmMerchantEvidence_delivery',
    )
    await runner.waitForTx(merchantEvTx)
    const merchantEntry = await ctx.merchant.evidence.get(ctx.paymentInfo, 1n)
    runner.assert(
      merchantEntry.submitter.toLowerCase() ===
        ctx.accounts.merchant.toLowerCase(),
      `Evidence submitter matches merchant (${ctx.accounts.merchant})`,
    )

    // ================================================================
    // Step 4: Arbiter reviews evidence
    // ================================================================
    runner.step('Arbiter reviews evidence')

    const evidenceCount = await ctx.arbiter.evidence.count(ctx.paymentInfo)
    runner.assert(evidenceCount === 2n, 'Evidence count === 2')

    const batch = await ctx.arbiter.evidence.getBatch(
      ctx.paymentInfo,
      0n,
      evidenceCount,
    )
    runner.log(`Evidence entries: ${batch.entries.length}`)
    for (const entry of batch.entries) {
      runner.log(`  CID: ${entry.cid} from ${entry.submitter}`)
    }

    // ================================================================
    // Step 5: Merchant executes refund (hook approves automatically)
    // ================================================================
    runner.step('Merchant executes voidPayment (hook approves)')

    // voidPayment empties the entire authorization in one transaction
    // (escrow.void is full-only — partial in-escrow refunds use
    // capture-then-refund via ReceiverRefundCollector instead).
    const refundTx = await ctx.merchant.payment.voidPayment(ctx.paymentInfo)
    await runner.waitForTx(refundTx)

    const approvedRequest = await ctx.merchant.refund.get(ctx.paymentInfo)
    runner.assert(
      approvedRequest.approvedAmount === PAYMENT_AMOUNT,
      `Approved amount === ${PAYMENT_AMOUNT}`,
    )
    runner.assert(
      approvedRequest.status === 1,
      'Refund status === Approved (1)',
    )

    // ================================================================
    // Step 6: Verify refund amounts
    // ================================================================
    runner.step('Verify refund amounts on operator')

    const amounts2 = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
    runner.assert(
      amounts2.refundableAmount === 0n,
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
    // Step 7: Distribute fees
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
