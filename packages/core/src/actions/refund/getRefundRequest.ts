import type { Address, PublicClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { RefundRequestData, RefundRequestStatus } from './types.js'

export interface GetRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
}
export type GetRefundRequestReturnType = RefundRequestData

export async function getRefundRequest(
  publicClient: PublicClient,
  parameters: GetRefundRequestParameters,
): Promise<GetRefundRequestReturnType> {
  const { contractAddress, paymentInfo } = parameters

  return wrapContractCall('getRefundRequest', async () => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'getRefundRequest',
      args: [paymentInfo],
    })
    return {
      paymentInfoHash: result.paymentInfoHash,
      amount: result.amount,
      approvedAmount: result.approvedAmount,
      status: result.status as RefundRequestStatus,
    }
  })
}
