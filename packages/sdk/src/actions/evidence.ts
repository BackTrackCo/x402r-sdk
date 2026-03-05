import {
  getEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  submitEvidence,
} from '@x402r/core'
import type { EvidenceActions, ResolvedConfig } from '../types.js'
import { requireEvidenceAddress, requireWalletClient } from './guards.js'

export function createEvidenceActions(config: ResolvedConfig): EvidenceActions {
  const { publicClient } = config

  return {
    get(paymentInfo, nonce, index) {
      const addr = requireEvidenceAddress(config, 'evidence.get')
      return getEvidence(publicClient, addr, paymentInfo, nonce, index)
    },

    getCount(paymentInfo, nonce) {
      const addr = requireEvidenceAddress(config, 'evidence.getCount')
      return getEvidenceCount(publicClient, addr, paymentInfo, nonce)
    },

    getBatch(paymentInfo, nonce, offset, count) {
      const addr = requireEvidenceAddress(config, 'evidence.getBatch')
      return getEvidenceBatch(
        publicClient,
        addr,
        paymentInfo,
        nonce,
        offset,
        count,
      )
    },

    submit(paymentInfo, nonce, cid) {
      const addr = requireEvidenceAddress(config, 'evidence.submit')
      const wc = requireWalletClient(config, 'evidence.submit')
      return submitEvidence(wc, addr, paymentInfo, nonce, cid)
    },
  }
}
