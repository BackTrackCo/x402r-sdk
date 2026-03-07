import type { Address, PublicClient } from 'viem'
import { erc20Abi } from 'viem'
import { wrapContractCall } from './error-wrapping.js'

export async function getRefundBudget(
  publicClient: PublicClient,
  token: Address,
  owner: Address,
  operatorAddress: Address,
): Promise<bigint> {
  return wrapContractCall('getRefundBudget', () =>
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, operatorAddress],
    }),
  )
}
