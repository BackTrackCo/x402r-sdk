import type { PaymentInfo } from '@x402r/core'
import {
  getEvidence as coreGetEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  submitEvidence,
  ValidationError,
} from '@x402r/core'
import type { Hash, WalletClient } from 'viem'
import type { EvidenceActions, ResolvedConfig } from '../types.js'

function requireWallet(config: ResolvedConfig): WalletClient {
  if (!config.walletClient)
    throw new ValidationError('walletClient is required for write operations')
  return config.walletClient
}

export function createEvidenceActions(config: ResolvedConfig): EvidenceActions {
  const contractAddress = config.refundRequestEvidenceAddress
  return {
    async submit(
      paymentInfo: PaymentInfo,
      nonce: bigint,
      cid: string,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return submitEvidence(wallet, {
        contractAddress,
        paymentInfo,
        nonce,
        cid,
      })
    },
    async get(paymentInfo: PaymentInfo, nonce: bigint, index: bigint) {
      return coreGetEvidence(config.publicClient, {
        contractAddress,
        paymentInfo,
        nonce,
        index,
      })
    },
    async getBatch(
      paymentInfo: PaymentInfo,
      nonce: bigint,
      offset: bigint,
      count: bigint,
    ) {
      return getEvidenceBatch(config.publicClient, {
        contractAddress,
        paymentInfo,
        nonce,
        offset,
        count,
      })
    },
    async count(paymentInfo: PaymentInfo, nonce: bigint) {
      return getEvidenceCount(config.publicClient, {
        contractAddress,
        paymentInfo,
        nonce,
      })
    },
  }
}
