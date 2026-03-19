import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Review Evidence ============
  // As an arbiter, review all evidence submitted for a refund dispute.
  // Evidence is submitted by payer and/or merchant; arbiter reads entries.
  //
  // Note: The evidence contract is factory-deployed alongside the RefundRequest.
  // Evidence is always available when using the deployment preset.

  if (
    !ctx.payer.refund ||
    !ctx.payer.evidence ||
    !ctx.merchant.evidence ||
    !ctx.arbiter.evidence
  ) {
    throw new Error(
      'Refund/evidence module not available — check operator configuration',
    )
  }

  // Setup: payer requests refund
  const reqTx = await ctx.payer.refund.request(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
    0n,
  )
  await ctx.waitForTx(reqTx)
  console.log('Payer requested refund')

  // Payer submits evidence
  const payerEvTx = await ctx.payer.evidence.submit(
    ctx.paymentInfo,
    0n,
    'QmPayerEvidence_receipt_screenshot',
  )
  await ctx.waitForTx(payerEvTx)
  console.log('Payer submitted evidence')

  // Merchant submits evidence
  const merchantEvTx = await ctx.merchant.evidence.submit(
    ctx.paymentInfo,
    0n,
    'QmMerchantEvidence_delivery_proof',
  )
  await ctx.waitForTx(merchantEvTx)
  console.log('Merchant submitted evidence')

  // Arbiter reviews all evidence
  const count = await ctx.arbiter.evidence.count(ctx.paymentInfo, 0n)
  console.log(`\nTotal evidence entries: ${count}`)

  const batch = await ctx.arbiter.evidence.getBatch(
    ctx.paymentInfo,
    0n,
    0n,
    count,
  )

  for (let i = 0; i < batch.entries.length; i++) {
    const entry = batch.entries[i]
    console.log(`\nEvidence #${i}:`)
    console.log(`  CID: ${entry.cid}`)
    console.log(`  Submitter: ${entry.submitter}`)

    // Verify submitter identity
    if (entry.submitter.toLowerCase() === ctx.accounts.payer.toLowerCase()) {
      console.log('  Role: Payer')
    } else if (
      entry.submitter.toLowerCase() === ctx.accounts.merchant.toLowerCase()
    ) {
      console.log('  Role: Merchant')
    } else {
      console.log('  Role: Unknown')
    }
  }
} finally {
  await ctx.cleanup()
}
