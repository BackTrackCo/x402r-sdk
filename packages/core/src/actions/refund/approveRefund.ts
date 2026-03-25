import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ApproveRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
  amount: bigint
}
export type ApproveRefundRequestReturnType = Hash

export async function approveRefund(
  walletClient: WalletClient,
  parameters: ApproveRefundRequestParameters,
): Promise<ApproveRefundRequestReturnType> {
  const { contractAddress, paymentInfo, nonce, amount } = parameters
  requireAccount(walletClient, 'approveRefund')

  return wrapContractCall('approveRefund', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'approve',
      args: [paymentInfo, nonce, amount, '0x'],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
