import type { Address, PublicClient } from 'viem'
import {
  getPayerPaymentsByEvents,
  getReceiverPaymentsByEvents,
} from '../actions/events/index.js'
import {
  getPayerPaymentsFromRecorder,
  getReceiverPaymentsFromRecorder,
  getRecorderPaymentInfo,
} from '../actions/recorder/index.js'
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

export function createRecorderProvider(
  publicClient: PublicClient,
  recorderAddress: Address,
): PaymentInfoProvider {
  return {
    name: 'recorder',
    async getByPayer(_, payer) {
      const result = await getPayerPaymentsFromRecorder(publicClient, {
        recorderAddress,
        payer,
        offset: 0n,
        count: 1000n,
      })
      return result.payments
    },
    async getByReceiver(_, receiver) {
      const result = await getReceiverPaymentsFromRecorder(publicClient, {
        recorderAddress,
        receiver,
        offset: 0n,
        count: 1000n,
      })
      return result.payments
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
): PaymentInfoProvider {
  return {
    name: 'events',
    async getByPayer(_, payer) {
      return getPayerPaymentsByEvents(publicClient, {
        operatorAddress,
        payer,
      })
    },
    async getByReceiver(_, receiver) {
      return getReceiverPaymentsByEvents(publicClient, {
        operatorAddress,
        receiver,
      })
    },
    async getByHash() {
      // Events can't efficiently look up by hash — scan would be too expensive
      return null
    },
  }
}
