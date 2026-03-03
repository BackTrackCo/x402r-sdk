import type { Address, Hash, WalletClient } from 'viem'
import { refundRequestEvidenceAbi } from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SubmitterRole = {
  Payer: 0,
  Receiver: 1,
  Arbiter: 2,
} as const

export type SubmitterRole = (typeof SubmitterRole)[keyof typeof SubmitterRole]

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

export async function submitEvidence(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cid: string,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('submitEvidence', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('submitEvidence', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: refundRequestEvidenceAbi,
      functionName: 'submitEvidence',
      args: [paymentInfo, nonce, cid],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}
