import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestConditionAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ApproveRefundParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type ApproveRefundReturnType = Hash

export async function approveRefund(
  walletClient: WalletClient,
  parameters: ApproveRefundParameters,
): Promise<ApproveRefundReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters
  requireAccount(walletClient, 'approveRefund')

  return wrapContractCall('approveRefund', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestConditionAbi,
      functionName: 'approve',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
