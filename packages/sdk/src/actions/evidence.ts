import type { PaymentInfo } from '@x402r/core'
import {
  getEvidence as coreGetEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  submitEvidence,
} from '@x402r/core'
import type { Address, Hash } from 'viem'
import type { EvidenceActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createEvidenceActions(
  config: ResolvedConfig,
  contractAddress: Address,
): EvidenceActions {
  return {
    async submit(paymentInfo: PaymentInfo, cid: string): Promise<Hash> {
      const wallet = requireWallet(config)
      return submitEvidence(wallet, {
        contractAddress,
        paymentInfo,
        cid,
      })
    },
    async get(paymentInfo: PaymentInfo, index: bigint) {
      return coreGetEvidence(config.publicClient, {
        contractAddress,
        paymentInfo,
        index,
      })
    },
    async getBatch(paymentInfo: PaymentInfo, offset: bigint, count: bigint) {
      return getEvidenceBatch(config.publicClient, {
        contractAddress,
        paymentInfo,
        offset,
        count,
      })
    },
    async count(paymentInfo: PaymentInfo) {
      return getEvidenceCount(config.publicClient, {
        contractAddress,
        paymentInfo,
      })
    },
  }
}
