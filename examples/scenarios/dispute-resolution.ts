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
//       verify zero protocol fees accrue
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

    const readBalance = (owner: `0x${string}`) =>
      ctx.publicClient.readContract({
        address: ctx.paymentInfo.token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })

    // Snapshot the payer's funded post-setup balance so Step 6 can assert the
    // refund actually moved tokens. Under a full refund, the payer pays
    // PAYMENT_AMOUNT on authorize and receives PAYMENT_AMOUNT on refund, so
    // the net delta must be exactly 0. A non-zero delta means tokens never
    // moved back (silent refund failure).
    const payerBalanceBefore = await readBalance(ctx.accounts.payer)

    // ================================================================
    // Step 1: Authorize payment (direct SDK call)
    // ================================================================
    runner.step('Authorize payment via SDK viem flow')

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
    // (escrow.void is full-only). For partial in-escrow refunds use the
    // partial-capture pattern: capture(merchantAmount) leaves the remainder
    // in escrow, then voidPayment() returns it to the payer (no allowance,
    // no ReceiverRefundCollector). See the changeset migration note + the
    // .extend() example in packages/sdk/README.md.
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

    const payerUsdcBalance = await readBalance(ctx.accounts.payer)
    runner.log(`Payer USDC balance: ${payerUsdcBalance}`)

    // Net-zero invariant: payer paid PAYMENT_AMOUNT on authorize and got
    // PAYMENT_AMOUNT back on full refund. A delta of -PAYMENT_AMOUNT would
    // indicate the refund silently failed to move tokens.
    const payerBalanceAfter = await readBalance(ctx.accounts.payer)
    const payerDelta = payerBalanceAfter - payerBalanceBefore
    runner.assert(
      payerDelta === 0n,
      `payer balance net-zero after full refund (authorized → refunded back); actual delta ${payerDelta}`,
    )

    // ================================================================
    // Step 7: Verify zero protocol fees accrued
    // ================================================================
    runner.step('Verify zero protocol fees accrued')

    const accumulatedFees =
      await ctx.merchant.operator.getAccumulatedProtocolFees(
        ctx.paymentInfo.token,
      )
    runner.log(`Accumulated protocol fees: ${accumulatedFees}`)

    // A full refund returns 100% of escrow to the payer and collects zero
    // protocol fees. Assert this explicitly — the previous
    // `if (accumulatedFees > 0n)` branch was dead under this scenario.
    runner.assert(
      accumulatedFees === 0n,
      `full refund collected zero protocol fees; actual ${accumulatedFees}`,
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
