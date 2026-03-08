import type { Address, PublicClient } from 'viem'
import { erc20Abi } from 'viem'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetRefundBudgetParameters {
  token: Address
  owner: Address
  operatorAddress: Address
}
export type GetRefundBudgetReturnType = bigint

export async function getRefundBudget(
  publicClient: PublicClient,
  parameters: GetRefundBudgetParameters,
): Promise<GetRefundBudgetReturnType> {
  const { token, owner, operatorAddress } = parameters

  return wrapContractCall('getRefundBudget', () =>
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, operatorAddress],
    }),
  )
}
