import type { Address, Hash, WalletClient } from 'viem'
import { erc20Abi } from 'viem'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ApprovePostEscrowRefundParameters {
  token: Address
  collectorAddress: Address
  amount: bigint
}
export type ApprovePostEscrowRefundReturnType = Hash

/** @deprecated Use {@link approvePostEscrowRefund} instead. */
export const approveRefundBudget = approvePostEscrowRefund
/** @deprecated Use {@link ApprovePostEscrowRefundParameters} instead. */
export type ApproveRefundBudgetParameters = ApprovePostEscrowRefundParameters
/** @deprecated Use {@link ApprovePostEscrowRefundReturnType} instead. */
export type ApproveRefundBudgetReturnType = ApprovePostEscrowRefundReturnType

export async function approvePostEscrowRefund(
  walletClient: WalletClient,
  parameters: ApprovePostEscrowRefundParameters,
): Promise<ApprovePostEscrowRefundReturnType> {
  const { token, collectorAddress, amount } = parameters
  requireAccount(walletClient, 'approvePostEscrowRefund')

  return wrapContractCall('approvePostEscrowRefund', () =>
    walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [collectorAddress, amount],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
