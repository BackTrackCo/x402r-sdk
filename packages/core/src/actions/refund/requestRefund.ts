import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface RequestRefundParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  nonce: bigint
}
export type RequestRefundReturnType = Hash

export async function requestRefund(
  walletClient: WalletClient,
  parameters: RequestRefundParameters,
): Promise<RequestRefundReturnType> {
  const { contractAddress, paymentInfo, amount, nonce } = parameters
  requireAccount(walletClient, 'requestRefund')

  return wrapContractCall('requestRefund', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'requestRefund',
      args: [paymentInfo, amount, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
