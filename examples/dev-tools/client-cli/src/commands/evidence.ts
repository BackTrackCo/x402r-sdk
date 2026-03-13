/**
 * Evidence Commands
 * Submit and view dispute evidence for a payment
 */

import type { PaymentInfo } from '@x402r/core'
import { createX402r } from '@x402r/sdk'
import type { PublicClient, WalletClient } from 'viem'

export interface EvidenceOptions {
  paymentInfo: PaymentInfo
  nonce: bigint
  operatorAddress: `0x${string}`
  refundRequestEvidenceAddress: `0x${string}`
  publicClient: PublicClient
  walletClient: WalletClient
}

export interface SubmitEvidenceResult {
  success: boolean
  txHash?: `0x${string}`
  error?: string
}

/**
 * Submit evidence for a dispute
 */
export async function submitEvidence(
  options: EvidenceOptions & { cid: string },
): Promise<SubmitEvidenceResult> {
  const {
    paymentInfo,
    nonce,
    cid,
    operatorAddress,
    refundRequestEvidenceAddress,
    publicClient,
    walletClient,
  } = options

  console.log('\nSubmitting evidence...')
  console.log('  CID:', cid)
  console.log('  Nonce:', nonce.toString())

  const x402r = createX402r({
    publicClient,
    walletClient,
    operatorAddress,
    refundRequestEvidenceAddress,
  })

  try {
    const txHash = await x402r.evidence.submit(paymentInfo, nonce, cid)
    console.log('\nEvidence submitted!')
    console.log('  Transaction:', txHash)

    return { success: true, txHash }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('\nSubmit evidence failed:', message)
    return { success: false, error: message }
  }
}

/**
 * List all evidence for a payment+nonce
 */
export async function listEvidence(
  options: Omit<EvidenceOptions, 'walletClient'>,
): Promise<void> {
  const {
    paymentInfo,
    nonce,
    operatorAddress,
    refundRequestEvidenceAddress,
    publicClient,
  } = options

  const x402r = createX402r({
    publicClient,
    operatorAddress,
    refundRequestEvidenceAddress,
  })

  const total = await x402r.evidence.count(paymentInfo, nonce)
  console.log(`\nEvidence count: ${total}`)

  if (total === 0n) {
    console.log('  No evidence submitted')
    return
  }

  const { entries } = await x402r.evidence.getBatch(
    paymentInfo,
    nonce,
    0n,
    total,
  )
  const roleNames = ['Payer', 'Receiver', 'Arbiter']

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const role = roleNames[e.role] || `Unknown(${e.role})`
    const ts = new Date(Number(e.timestamp) * 1000).toISOString()
    console.log(`\n  [${i}] ${role} ${e.submitter}`)
    console.log(`      Timestamp: ${ts}`)
    console.log(`      CID: ${e.cid}`)
  }
}
