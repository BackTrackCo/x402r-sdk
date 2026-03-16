import type { Address, PublicClient } from 'viem'
import { erc20Abi } from 'viem'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPostEscrowRefundAllowanceParameters {
  token: Address
  owner: Address
  collectorAddress: Address
}
export type GetPostEscrowRefundAllowanceReturnType = bigint

export async function getPostEscrowRefundAllowance(
  publicClient: PublicClient,
  parameters: GetPostEscrowRefundAllowanceParameters,
): Promise<GetPostEscrowRefundAllowanceReturnType> {
  const { token, owner, collectorAddress } = parameters

  return wrapContractCall('getPostEscrowRefundAllowance', () =>
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, collectorAddress],
    }),
  )
}
