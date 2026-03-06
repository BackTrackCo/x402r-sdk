import type { Address, PublicClient } from 'viem'
import { erc20Abi } from 'viem'

export async function getRefundBudget(
  publicClient: PublicClient,
  token: Address,
  owner: Address,
  operatorAddress: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, operatorAddress],
  })
}
