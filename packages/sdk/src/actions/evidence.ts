import type { PaymentInfo } from '@x402r/core'
import {
  getEvidence as coreGetEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  submitEvidence,
} from '@x402r/core'
import type { Hash } from 'viem'
import type { EvidenceActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createEvidenceActions(
  config: ResolvedConfig,
  contractAddress: `0x${string}`,
): EvidenceActions {
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
