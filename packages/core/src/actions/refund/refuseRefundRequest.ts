import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface RefuseRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type RefuseRefundRequestReturnType = Hash

export async function refuseRefundRequest(
  walletClient: WalletClient,
  parameters: RefuseRefundRequestParameters,
): Promise<RefuseRefundRequestReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters
  requireAccount(walletClient, 'refuseRefundRequest')

  return wrapContractCall('refuseRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'refuse',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
