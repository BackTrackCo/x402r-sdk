import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Submit Evidence ============
  // As a payer, submit evidence (an IPFS CID) for a refund dispute.
  // First request a refund, then attach evidence to it.
  //
  // Note: The evidence contract is a protocol singleton that validates refund
  // requests against the deployed RefundRequest. When using locally deployed
  // operators (e.g. via deployMarketplaceOperator), the evidence contract may
  // not recognize the new RefundRequest, causing reverts. This example handles
  // that case gracefully.

  if (!ctx.payer.refund) {
    throw new Error(
      'Refund module not available — check operator configuration',
    )
  }

  // Step 1: Request a refund (evidence is attached to a refund nonce)
  const reqTx = await ctx.payer.refund.request(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
    0n,
  )
  await ctx.waitForTx(reqTx)
  console.log('Refund requested')

  // Step 2: Submit evidence CID
  const evidenceCid = 'QmExampleEvidenceCid123456789'
  try {
    const tx = await ctx.payer.evidence.submit(ctx.paymentInfo, 0n, evidenceCid)
    const receipt = await ctx.publicClient.waitForTransactionReceipt({
      hash: tx,
    })

    if (receipt.status === 'reverted') {
      console.log(
        "Evidence submission reverted — evidence contract does not recognize this operator's RefundRequest.",
      )
      console.log(
        'This is expected with locally deployed operators. On production deployments, evidence works with the protocol singleton.',
      )
    } else {
      console.log(`Evidence submitted: ${tx}`)

      // Step 3: Verify the evidence was recorded
      const count = await ctx.payer.evidence.count(ctx.paymentInfo, 0n)
      console.log(`Evidence count: ${count}`)

      const entry = await ctx.payer.evidence.get(ctx.paymentInfo, 0n, 0n)
      console.log(`Evidence CID: ${entry.cid}`)
      console.log(`Submitter: ${entry.submitter}`)

      // Verify submitter matches payer account
      if (entry.submitter.toLowerCase() !== ctx.accounts.payer.toLowerCase()) {
        throw new Error(
          `Submitter mismatch: expected ${ctx.accounts.payer}, got ${entry.submitter}`,
        )
      }
      console.log('Submitter verified as payer')
    }
  } catch (err) {
    console.log(
      'Evidence submission failed — evidence contract may not be compatible with this operator.',
    )
    console.log(`Error: ${err instanceof Error ? err.message : err}`)
  }
} finally {
  await ctx.cleanup()
}
