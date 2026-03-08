import type { Address, PublicClient } from 'viem'
import { refundRequestEvidenceAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetEvidenceCountParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type GetEvidenceCountReturnType = bigint

export async function getEvidenceCount(
  publicClient: PublicClient,
  parameters: GetEvidenceCountParameters,
): Promise<GetEvidenceCountReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters

  return wrapContractCall('getEvidenceCount', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'getEvidenceCount',
      args: [paymentInfo, nonce],
    }),
  )
}
