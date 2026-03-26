import type { Address, PublicClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface HasRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
}
export type HasRefundRequestReturnType = boolean

export async function hasRefundRequest(
  publicClient: PublicClient,
  parameters: HasRefundRequestParameters,
): Promise<HasRefundRequestReturnType> {
  const { contractAddress, paymentInfo } = parameters

  return wrapContractCall('hasRefundRequest', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'hasRefundRequest',
      args: [paymentInfo],
    }),
  )
}
