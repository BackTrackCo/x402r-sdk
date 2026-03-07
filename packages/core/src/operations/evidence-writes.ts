import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestEvidenceAbi } from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { requireAccount, wrapContractCall } from './error-wrapping.js'

export async function submitEvidence(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cid: string,
): Promise<Hash> {
  requireAccount(walletClient, 'submitEvidence')

  return wrapContractCall('submitEvidence', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'submitEvidence',
      args: [paymentInfo, nonce, cid],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
