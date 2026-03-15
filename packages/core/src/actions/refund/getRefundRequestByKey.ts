import type { Address, Hex, PublicClient } from 'viem'
import { refundRequestConditionAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { RefundRequestData, RefundRequestStatus } from './types.js'

export interface GetRefundRequestByKeyParameters {
  contractAddress: Address
  compositeKey: Hex
}
export type GetRefundRequestByKeyReturnType = RefundRequestData

export async function getRefundRequestByKey(
  publicClient: PublicClient,
  parameters: GetRefundRequestByKeyParameters,
): Promise<GetRefundRequestByKeyReturnType> {
  const { contractAddress, compositeKey } = parameters

  return wrapContractCall('getRefundRequestByKey', async () => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestConditionAbi,
      functionName: 'getRefundRequestByKey',
      args: [compositeKey],
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
