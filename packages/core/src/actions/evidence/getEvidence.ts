import type { Address, PublicClient } from 'viem'
import { refundRequestEvidenceAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { EvidenceEntry, SubmitterRole } from './types.js'

export interface GetEvidenceParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
  index: bigint
}
export type GetEvidenceReturnType = EvidenceEntry

export async function getEvidence(
  publicClient: PublicClient,
  parameters: GetEvidenceParameters,
): Promise<GetEvidenceReturnType> {
  const { contractAddress, paymentInfo, nonce, index } = parameters

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
