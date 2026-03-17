import type { Address, Hex, PublicClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetOperatorRefundRequestsParameters {
  contractAddress: Address
  operator: Address
  offset: bigint
  count: bigint
}
export interface GetOperatorRefundRequestsReturnType {
  keys: readonly Hex[]
  total: bigint
}

export async function getOperatorRefundRequests(
  publicClient: PublicClient,
  parameters: GetOperatorRefundRequestsParameters,
): Promise<GetOperatorRefundRequestsReturnType> {
  const { contractAddress, operator, offset, count } = parameters

  return wrapContractCall('getOperatorRefundRequests', async () => {
    const [keys, total] = await publicClient.readContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'getOperatorRefundRequests',
      args: [operator, offset, count],
    })
    return { keys: keys as readonly Hex[], total }
  })
}
