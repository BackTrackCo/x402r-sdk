import type { Address, Hash, WalletClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface DenyRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type DenyRefundRequestReturnType = Hash

export async function denyRefundRequest(
  walletClient: WalletClient,
  parameters: DenyRefundRequestParameters,
): Promise<DenyRefundRequestReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters
  requireAccount(walletClient, 'denyRefundRequest')

  return wrapContractCall('denyRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'deny',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
