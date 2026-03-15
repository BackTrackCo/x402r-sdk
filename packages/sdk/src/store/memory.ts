import type { PaymentInfo } from '@x402r/core'
import type { Address, Hex } from 'viem'
import type { PaymentStore } from './types.js'

/**
 * In-memory PaymentStore adapter.
 * Suitable for Node.js, testing, and short-lived processes.
 * Data is lost when the process exits.
 */
export function createMemoryStore(): PaymentStore {
  // chainId → hash → PaymentInfo
  const data = new Map<number, Map<Hex, PaymentInfo>>()

  function getChain(chainId: number): Map<Hex, PaymentInfo> {
    let chain = data.get(chainId)
    if (!chain) {
      chain = new Map()
      data.set(chainId, chain)
    }
    return chain
  }

  return {
    async save(
      chainId: number,
      hash: Hex,
      paymentInfo: PaymentInfo,
    ): Promise<void> {
      const chain = getChain(chainId)
      chain.set(hash, paymentInfo)
    },

    async getByPayer(chainId: number, payer: Address): Promise<PaymentInfo[]> {
      const chain = data.get(chainId)
      if (!chain) return []
      const results: PaymentInfo[] = []
      for (const info of chain.values()) {
        if (info.payer.toLowerCase() === payer.toLowerCase()) {
          results.push(info)
        }
      }
      return results
    },

    async getByReceiver(
      chainId: number,
      receiver: Address,
    ): Promise<PaymentInfo[]> {
      const chain = data.get(chainId)
      if (!chain) return []
      const results: PaymentInfo[] = []
      for (const info of chain.values()) {
        if (info.receiver.toLowerCase() === receiver.toLowerCase()) {
          results.push(info)
        }
      }
      return results
    },

    async getByHash(chainId: number, hash: Hex): Promise<PaymentInfo | null> {
      const chain = data.get(chainId)
      if (!chain) return null
      return chain.get(hash) ?? null
    },

    async remove(chainId: number, hash: Hex): Promise<void> {
      const chain = data.get(chainId)
      if (chain) chain.delete(hash)
    },
  }
}
