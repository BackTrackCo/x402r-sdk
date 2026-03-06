import type { Address, Hash, PublicClient, WalletClient } from 'viem'
import { refundRequestEvidenceAbi } from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
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
  role: number
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
  const result = await publicClient.readContract({
    address: contractAddress,
    abi: refundRequestEvidenceAbi,
    functionName: 'getEvidence',
    args: [paymentInfo, nonce, index],
  })
  return {
    submitter: result.submitter,
    role: result.role,
    timestamp: result.timestamp,
    cid: result.cid,
  }
}

export async function getEvidenceCount(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<bigint> {
  return publicClient.readContract({
    address: contractAddress,
    abi: refundRequestEvidenceAbi,
    functionName: 'getEvidenceCount',
    args: [paymentInfo, nonce],
  }) as Promise<bigint>
}

export async function getEvidenceBatch(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  offset: bigint,
  count: bigint,
): Promise<{ entries: EvidenceEntry[]; total: bigint }> {
  const [rawEntries, total] = await publicClient.readContract({
    address: contractAddress,
    abi: refundRequestEvidenceAbi,
    functionName: 'getEvidenceBatch',
    args: [paymentInfo, nonce, offset, count],
  })
  const entries = rawEntries.map(({ submitter, role, timestamp, cid }) => ({
    submitter,
    role,
    timestamp,
    cid,
  }))
  return { entries, total }
}

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

export async function submitEvidence(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cid: string,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('submitEvidence', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('submitEvidence', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'submitEvidence',
      args: [paymentInfo, nonce, cid],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}
