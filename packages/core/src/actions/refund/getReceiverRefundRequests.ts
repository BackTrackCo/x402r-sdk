import type { Address, Hex, PublicClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetReceiverRefundRequestsParameters {
  contractAddress: Address
  receiver: Address
  offset: bigint
  count: bigint
}
export interface GetReceiverRefundRequestsReturnType {
  keys: readonly Hex[]
  total: bigint
}

export async function getReceiverRefundRequests(
  publicClient: PublicClient,
  parameters: GetReceiverRefundRequestsParameters,
): Promise<GetReceiverRefundRequestsReturnType> {
  const { contractAddress, receiver, offset, count } = parameters

  return wrapContractCall('getReceiverRefundRequests', async () => {
    const [keys, total] = await publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getReceiverRefundRequests',
      args: [receiver, offset, count],
    })
    return { keys: keys as readonly Hex[], total }
  })
}
