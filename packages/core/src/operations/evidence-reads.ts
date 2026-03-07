import type { Address, PublicClient } from 'viem'
import { refundRequestEvidenceAbi } from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SubmitterRole = {
  Payer: 0,
  Receiver: 1,
  Arbiter: 2,
} as const

export type SubmitterRole = (typeof SubmitterRole)[keyof typeof SubmitterRole]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvidenceEntry {
  submitter: Address
  role: SubmitterRole
  timestamp: number
  cid: string
}

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

export async function getEvidence(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  index: bigint,
): Promise<EvidenceEntry> {
  return wrapContractCall('getEvidence', async () => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'getEvidence',
      args: [paymentInfo, nonce, index],
    })
    return {
      submitter: result.submitter,
      role: result.role as SubmitterRole,
      timestamp: result.timestamp,
      cid: result.cid,
    }
  })
}

export async function getEvidenceCount(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<bigint> {
  return wrapContractCall('getEvidenceCount', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'getEvidenceCount',
      args: [paymentInfo, nonce],
    }),
  )
}

export async function getEvidenceBatch(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  offset: bigint,
  count: bigint,
): Promise<{ entries: EvidenceEntry[]; total: bigint }> {
  return wrapContractCall('getEvidenceBatch', async () => {
    const [rawEntries, total] = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'getEvidenceBatch',
      args: [paymentInfo, nonce, offset, count],
    })
    const entries = rawEntries.map(({ submitter, role, timestamp, cid }) => ({
      submitter,
      role: role as SubmitterRole,
      timestamp,
      cid,
    }))
    return { entries, total }
  })
}
