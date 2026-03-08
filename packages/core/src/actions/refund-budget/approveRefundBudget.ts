import type { Address, Hash, WalletClient } from 'viem'
import { erc20Abi } from 'viem'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ApproveRefundBudgetParameters {
  token: Address
  operatorAddress: Address
  amount: bigint
}
export type ApproveRefundBudgetReturnType = Hash

export async function approveRefundBudget(
  walletClient: WalletClient,
  parameters: ApproveRefundBudgetParameters,
): Promise<ApproveRefundBudgetReturnType> {
  const { token, operatorAddress, amount } = parameters
  requireAccount(walletClient, 'approveRefundBudget')

  return wrapContractCall('approveRefundBudget', () =>
    walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [operatorAddress, amount],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
