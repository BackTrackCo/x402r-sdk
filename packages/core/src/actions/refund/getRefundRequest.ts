import type { Address, PublicClient } from 'viem'
import { refundRequestConditionAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { RefundRequestData, RefundRequestStatus } from './types.js'

export interface GetRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type GetRefundRequestReturnType = RefundRequestData

export async function getRefundRequest(
  publicClient: PublicClient,
  parameters: GetRefundRequestParameters,
): Promise<GetRefundRequestReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters

  return wrapContractCall('getRefundRequest', async () => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestConditionAbi,
      functionName: 'getRefundRequest',
      args: [paymentInfo, nonce],
    })
    return {
      paymentInfoHash: result.paymentInfoHash,
      nonce: result.nonce,
      amount: result.amount,
      approvedAmount: result.approvedAmount,
      status: result.status as RefundRequestStatus,
    }
  })
}
