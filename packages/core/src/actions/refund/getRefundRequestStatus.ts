import type { Address, PublicClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { RefundRequestStatus } from './types.js'

export interface GetRefundRequestStatusParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type GetRefundRequestStatusReturnType = RefundRequestStatus

export async function getRefundRequestStatus(
  publicClient: PublicClient,
  parameters: GetRefundRequestStatusParameters,
): Promise<GetRefundRequestStatusReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters

  return wrapContractCall('getRefundRequestStatus', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getRefundRequestStatus',
      args: [paymentInfo, nonce],
    }),
  ) as Promise<RefundRequestStatus>
}
