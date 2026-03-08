import type { Address, PublicClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetCancelCountParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type GetCancelCountReturnType = bigint

export async function getCancelCount(
  publicClient: PublicClient,
  parameters: GetCancelCountParameters,
): Promise<GetCancelCountReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters

  return wrapContractCall('getCancelCount', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getCancelCount',
      args: [paymentInfo, nonce],
    }),
  )
}
