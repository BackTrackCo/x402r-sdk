import {
  getPayerPaymentsByEvents,
  getPayerPaymentsFromRecorder,
  getReceiverPaymentsByEvents,
  getReceiverPaymentsFromRecorder,
  getRecorderPaymentInfo,
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

/** Default page size for recorder pagination. */
const DEFAULT_PAGE_SIZE = 1000n

export function createRecorderProvider(
  publicClient: PublicClient,
  recorderAddress: Address,
  pageSize: bigint = DEFAULT_PAGE_SIZE,
): PaymentInfoProvider {
  return {
    name: 'recorder',
    async getByPayer(_, payer) {
      const all: PaymentInfo[] = []
      let offset = 0n
      let total: bigint
      do {
        const result = await getPayerPaymentsFromRecorder(publicClient, {
          recorderAddress,
          payer,
          offset,
          count: pageSize,
        })
        all.push(...result.payments)
        total = result.total
        offset += BigInt(result.payments.length)
      } while (offset < total)
      return all
    },
    async getByReceiver(_, receiver) {
      const all: PaymentInfo[] = []
      let offset = 0n
      let total: bigint
      do {
        const result = await getReceiverPaymentsFromRecorder(publicClient, {
          recorderAddress,
          receiver,
          offset,
          count: pageSize,
        })
        all.push(...result.payments)
        total = result.total
        offset += BigInt(result.payments.length)
      } while (offset < total)
      return all
    },
    async getByHash(_, hash) {
      return getRecorderPaymentInfo(publicClient, {
        recorderAddress,
        hash,
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
