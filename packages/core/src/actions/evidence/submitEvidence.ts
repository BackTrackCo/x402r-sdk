import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestEvidenceAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface SubmitEvidenceParameters {
  contractAddress: Address
  refundRequestAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
  cid: string
}
export type SubmitEvidenceReturnType = Hash

export async function submitEvidence(
  walletClient: WalletClient,
  parameters: SubmitEvidenceParameters,
): Promise<SubmitEvidenceReturnType> {
  const { contractAddress, refundRequestAddress, paymentInfo, nonce, cid } =
    parameters
  requireAccount(walletClient, 'submitEvidence')

  return wrapContractCall('submitEvidence', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'submitEvidence',
      args: [paymentInfo, nonce, cid, refundRequestAddress],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
