import type { Address, PublicClient } from 'viem'
import { erc20Abi } from 'viem'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetRefundAllowanceParameters {
  token: Address
  owner: Address
  collectorAddress: Address
}
export type GetRefundAllowanceReturnType = bigint

/**
 * Read the ERC-20 allowance set on a refund token collector. Pair with
 * `approveRefundAllowance` to manage the merchant's refund budget.
 */
export async function getRefundAllowance(
  publicClient: PublicClient,
  parameters: GetRefundAllowanceParameters,
): Promise<GetRefundAllowanceReturnType> {
  const { token, owner, collectorAddress } = parameters

  return wrapContractCall('getRefundAllowance', () =>
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, collectorAddress],
    }),
  )
}
