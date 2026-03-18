import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Review Evidence ============
  // As an arbiter, review all evidence submitted for a refund dispute.
  // Evidence is submitted by payer and/or merchant; arbiter reads entries.
  //
  // Note: The evidence contract is a protocol singleton. With locally deployed
  // operators, evidence submission may revert because the evidence contract
  // doesn't recognize the new RefundRequest. This example handles that case.

  if (!ctx.payer.refund) {
    throw new Error(
      'Refund module not available — check operator configuration',
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

  // Try to submit evidence — may revert with locally deployed operators
  let evidenceAvailable = false
  try {
    const payerEvTx = await ctx.payer.evidence.submit(
      ctx.paymentInfo,
      0n,
      'QmPayerEvidence_receipt_screenshot',
    )
    const receipt1 = await ctx.publicClient.waitForTransactionReceipt({
      hash: payerEvTx,
    })
    if (receipt1.status === 'reverted') {
      console.log(
        'Evidence submission reverted — evidence contract does not recognize this operator.',
      )
      console.log(
        'On production deployments, evidence works with the protocol singleton.\n',
      )
    } else {
      console.log('Payer submitted evidence')

      const merchantEvTx = await ctx.merchant.evidence.submit(
        ctx.paymentInfo,
        0n,
        'QmMerchantEvidence_delivery_proof',
      )
      await ctx.waitForTx(merchantEvTx)
      console.log('Merchant submitted evidence')
      evidenceAvailable = true
    }
  } catch (err) {
    console.log(
      `Evidence submission failed: ${err instanceof Error ? err.message : err}`,
    )
  }

  if (evidenceAvailable) {
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
  } else {
    console.log(
      'Skipping evidence review — evidence not available with this operator configuration.',
    )
  }
} finally {
  await ctx.cleanup()
}
