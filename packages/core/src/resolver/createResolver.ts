import type { Address, Hex } from 'viem'
import type { PaymentInfo } from '../types/index.js'
import type { PaymentInfoProvider, PaymentInfoResolver } from './types.js'

/**
 * Creates a tiered PaymentInfo resolver that tries providers in order.
 * Resolution order: store → recorder → subgraph → events
 * First provider to return results wins.
 */
export function createPaymentInfoResolver(
  chainId: number,
  providers: PaymentInfoProvider[],
): PaymentInfoResolver {
  return {
    async getByPayer(payer: Address): Promise<PaymentInfo[]> {
      for (const provider of providers) {
        try {
          const results = await provider.getByPayer(chainId, payer)
          if (results.length > 0) return results
        } catch {
          // Provider failed, try next
        }
      }
      return []
    },

    async getByReceiver(receiver: Address): Promise<PaymentInfo[]> {
      for (const provider of providers) {
        try {
          const results = await provider.getByReceiver(chainId, receiver)
          if (results.length > 0) return results
        } catch {
          // Provider failed, try next
        }
      }
      return []
    },

    async getByHash(hash: Hex): Promise<PaymentInfo | null> {
      for (const provider of providers) {
        try {
          const result = await provider.getByHash(chainId, hash)
          if (result) return result
        } catch {
          // Provider failed, try next
        }
      }
      return null
    },
  }
}
