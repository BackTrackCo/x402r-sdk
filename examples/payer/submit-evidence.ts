import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Submit Evidence ============
  // As a payer, submit evidence (an IPFS CID) for a refund dispute.
  // First request a refund, then attach evidence to it.
  //
  // Note: The evidence contract is factory-deployed alongside the RefundRequest
  // via deployMarketplaceOperator. Evidence is always available when using the
  // deployment preset.

  if (!ctx.payer.refund || !ctx.payer.evidence) {
    throw new Error(
      'Refund/evidence module not available — check operator configuration',
    )
  }

  // Step 1: Request a refund (evidence is keyed by paymentInfo)
  const reqTx = await ctx.payer.refund.request(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
  )
  await ctx.waitForTx(reqTx)
  console.log('Refund requested')

  // Step 2: Submit evidence CID
  const evidenceCid = 'QmExampleEvidenceCid123456789'
  const tx = await ctx.payer.evidence.submit(ctx.paymentInfo, evidenceCid)
  await ctx.waitForTx(tx)
  console.log(`Evidence submitted: ${tx}`)

  // Step 3: Verify the evidence was recorded
  const count = await ctx.payer.evidence.count(ctx.paymentInfo)
  console.log(`Evidence count: ${count}`)

  const entry = await ctx.payer.evidence.get(ctx.paymentInfo, 0n)
  console.log(`Evidence CID: ${entry.cid}`)
  console.log(`Submitter: ${entry.submitter}`)

  // Verify submitter matches payer account
  if (entry.submitter.toLowerCase() !== ctx.accounts.payer.toLowerCase()) {
    throw new Error(
      `Submitter mismatch: expected ${ctx.accounts.payer}, got ${entry.submitter}`,
    )
  }
  console.log('Submitter verified as payer')
} finally {
  await ctx.cleanup()
}
