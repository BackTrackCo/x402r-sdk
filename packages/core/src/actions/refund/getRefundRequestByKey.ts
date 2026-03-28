import type { Address, Hex, PublicClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { RefundRequestData, RefundRequestStatus } from './types.js'

export interface GetRefundRequestByKeyParameters {
  contractAddress: Address
  paymentInfoHash: Hex
}
export type GetRefundRequestByKeyReturnType = RefundRequestData

export async function getRefundRequestByKey(
  publicClient: PublicClient,
  parameters: GetRefundRequestByKeyParameters,
): Promise<GetRefundRequestByKeyReturnType> {
  const { contractAddress, paymentInfoHash } = parameters

  return wrapContractCall('getRefundRequestByKey', async () => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'getRefundRequestByKey',
      args: [paymentInfoHash],
    })
    return {
      paymentInfoHash: result.paymentInfoHash,
      amount: result.amount,
      approvedAmount: result.approvedAmount,
      status: result.status as RefundRequestStatus,
    }
  })
}
