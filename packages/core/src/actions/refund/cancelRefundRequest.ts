import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface CancelRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
}
export type CancelRefundRequestReturnType = Hash

export async function cancelRefundRequest(
  walletClient: WalletClient,
  parameters: CancelRefundRequestParameters,
): Promise<CancelRefundRequestReturnType> {
  const { contractAddress, paymentInfo } = parameters
  requireAccount(walletClient, 'cancelRefundRequest')

  return wrapContractCall('cancelRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'cancelRefundRequest',
      args: [paymentInfo],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
