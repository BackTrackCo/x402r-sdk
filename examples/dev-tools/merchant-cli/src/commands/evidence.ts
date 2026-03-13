/**
 * Evidence Commands for Merchant CLI
 * Submit and view dispute evidence
 */

import type { PaymentInfo } from '@x402r/core'
import type { X402r } from '@x402r/sdk'
import { formatEvidenceList } from '../../../shared/utils.js'

/**
 * Show all evidence for a payment+nonce
 */
export async function showEvidence(
  x402r: X402r,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<void> {
  const count = await x402r.evidence.count(paymentInfo, nonce)
  console.log(`\nEvidence count: ${count}`)

  if (count === 0n) {
    console.log('  No evidence submitted')
    return
  }

  const { entries } = await x402r.evidence.getBatch(
    paymentInfo,
    nonce,
    0n,
    count,
  )
  console.log('\n=== Evidence Entries ===')
  console.log(formatEvidenceList(entries))
}

/**
 * Submit evidence as merchant (receiver role)
 */
export async function submitMerchantEvidence(
  x402r: X402r,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cid: string,
): Promise<`0x${string}`> {
  console.log('\nSubmitting merchant evidence...')
  console.log('  CID:', cid)
  console.log('  Nonce:', nonce.toString())

  const txHash = await x402r.evidence.submit(paymentInfo, nonce, cid)
  console.log('\nEvidence submitted!')
  console.log('  Transaction:', txHash)

  return txHash
}
