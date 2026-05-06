import type { Address, Hash, WalletClient } from 'viem'
import { erc20Abi } from 'viem'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ApproveRefundAllowanceParameters {
  token: Address
  collectorAddress: Address
  amount: bigint
}
export type ApproveRefundAllowanceReturnType = Hash

/**
 * Set an ERC-20 allowance on a refund token collector (typically
 * `ReceiverRefundCollector`). Pre-stake the budget that `refund()` will pull
 * from when partial refunds happen post-capture.
 */
export async function approveRefundAllowance(
  walletClient: WalletClient,
  parameters: ApproveRefundAllowanceParameters,
): Promise<ApproveRefundAllowanceReturnType> {
  const { token, collectorAddress, amount } = parameters
  requireAccount(walletClient, 'approveRefundAllowance')

  return wrapContractCall('approveRefundAllowance', () =>
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
