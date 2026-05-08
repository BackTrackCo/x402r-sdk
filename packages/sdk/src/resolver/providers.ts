import {
  getHookPaymentInfo,
  getPayerPaymentsByEvents,
  getPayerPaymentsFromHook,
  getReceiverPaymentsByEvents,
  getReceiverPaymentsFromHook,
  type PaymentInfo,
} from '@x402r/core'
import type { Address, PublicClient } from 'viem'
import type { PaymentStore } from '../store/types.js'
import type { PaymentInfoProvider } from './types.js'

export function createStoreProvider(store: PaymentStore): PaymentInfoProvider {
  return {
    name: 'store',
    getByPayer: (chainId, payer) => store.getByPayer(chainId, payer),
    getByReceiver: (chainId, receiver) =>
      store.getByReceiver(chainId, receiver),
    getByHash: (chainId, hash) => store.getByHash(chainId, hash),
  }
}

/** Default page size for hook pagination. */
const DEFAULT_PAGE_SIZE = 1000n

/**
 * Options for `createHookProvider`.
 * - `pageSize`: page size for paginated reads (default 1000).
 * - `operatorAddress`: if set, scopes hook reads to this operator. The
 *   canonical `PaymentIndexRecorderHook` is a chain singleton aggregating
 *   across every operator routing through HookCombinator; without this
 *   option, multi-operator deployments receive mingled records. Pagination
 *   remains correct because offset is advanced by the requested page size,
 *   not by post-filter length.
 *
 * Perf caveat: `total` from the hook contract is the unfiltered cross-
 * operator count. When `operatorAddress` is set against a heavily-shared
 * singleton (many co-tenants), the loop issues one RPC per page across the
 * full unfiltered range and discards most results client-side. Acceptable
 * at small scale; cursor-based pagination on the hook contract is the real
 * fix and is intended follow-up work.
 */
export function createHookProvider(
  publicClient: PublicClient,
  hookAddress: Address,
  options: { pageSize?: bigint; operatorAddress?: Address } = {},
): PaymentInfoProvider {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const operatorAddress = options.operatorAddress
  return {
    name: 'hook',
    async getByPayer(_, payer) {
      const all: PaymentInfo[] = []
      let offset = 0n
      let total = 0n
      do {
        const result = await getPayerPaymentsFromHook(publicClient, {
          hookAddress,
          payer,
          offset,
          count: pageSize,
          operatorAddress,
        })
        all.push(...result.payments)
        total = result.total
        offset += pageSize
      } while (offset < total)
      return all
    },
    async getByReceiver(_, receiver) {
      const all: PaymentInfo[] = []
      let offset = 0n
      let total = 0n
      do {
        const result = await getReceiverPaymentsFromHook(publicClient, {
          hookAddress,
          receiver,
          offset,
          count: pageSize,
          operatorAddress,
        })
        all.push(...result.payments)
        total = result.total
        offset += pageSize
      } while (offset < total)
      return all
    },
    async getByHash(_, hash) {
      return getHookPaymentInfo(publicClient, {
        hookAddress,
        hash,
        operatorAddress,
      })
    },
  }
}

export function createEventProvider(
  publicClient: PublicClient,
  operatorAddress: Address,
  fromBlock: bigint,
): PaymentInfoProvider {
  return {
    name: 'events',
    async getByPayer(_, payer) {
      return getPayerPaymentsByEvents(publicClient, {
        operatorAddress,
        payer,
        fromBlock,
      })
    },
    async getByReceiver(_, receiver) {
      return getReceiverPaymentsByEvents(publicClient, {
        operatorAddress,
        receiver,
        fromBlock,
      })
    },
    async getByHash() {
      // Events can't efficiently look up by hash — scan would be too expensive
      return null
    },
  }
}
