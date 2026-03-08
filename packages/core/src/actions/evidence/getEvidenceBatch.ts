import type { Address, PublicClient } from 'viem'
import { refundRequestEvidenceAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { EvidenceEntry, SubmitterRole } from './types.js'

export interface GetEvidenceBatchParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
  offset: bigint
  count: bigint
}
export interface GetEvidenceBatchReturnType {
  entries: EvidenceEntry[]
  total: bigint
}

export async function getEvidenceBatch(
  publicClient: PublicClient,
  parameters: GetEvidenceBatchParameters,
): Promise<GetEvidenceBatchReturnType> {
  const { contractAddress, paymentInfo, nonce, offset, count } = parameters

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
