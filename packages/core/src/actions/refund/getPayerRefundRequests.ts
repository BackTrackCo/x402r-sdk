import type { Address, Hex, PublicClient } from 'viem'
import { refundRequestConditionAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPayerRefundRequestsParameters {
  contractAddress: Address
  payer: Address
  offset: bigint
  count: bigint
}
export interface GetPayerRefundRequestsReturnType {
  keys: readonly Hex[]
  total: bigint
}

export async function getPayerRefundRequests(
  publicClient: PublicClient,
  parameters: GetPayerRefundRequestsParameters,
): Promise<GetPayerRefundRequestsReturnType> {
  const { contractAddress, payer, offset, count } = parameters

  return wrapContractCall('getPayerRefundRequests', async () => {
    const [keys, total] = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestConditionAbi,
      functionName: 'getPayerRefundRequests',
      args: [payer, offset, count],
    })
    return { keys: keys as readonly Hex[], total }
  })
}
