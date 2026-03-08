import type { Address, Hash, Hex, WalletClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ApproveRefundWithSignatureParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
  amount: bigint
  expiry: number
  signature: Hex
}
export type ApproveRefundWithSignatureReturnType = Hash

export async function approveRefundWithSignature(
  walletClient: WalletClient,
  parameters: ApproveRefundWithSignatureParameters,
): Promise<ApproveRefundWithSignatureReturnType> {
  const { contractAddress, paymentInfo, nonce, amount, expiry, signature } =
    parameters
  requireAccount(walletClient, 'approveRefundWithSignature')

  return wrapContractCall('approveRefundWithSignature', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'approveWithSignature',
      args: [paymentInfo, nonce, amount, expiry, signature],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
