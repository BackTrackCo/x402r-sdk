import type { PaymentInfo } from '@x402r/core'
import {
  authorize as coreAuthorize,
  charge as coreCharge,
  release as coreRelease,
  getPaymentAmounts,
  getPaymentState,
} from '@x402r/core'
import type { Address, Hash, Hex } from 'viem'
import type { PaymentActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createPaymentActions(config: ResolvedConfig): PaymentActions {
  return {
    async authorize(
      paymentInfo: PaymentInfo,
      amount: bigint,
      tokenCollector: Address,
      collectorData: Hex,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreAuthorize(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
      })
    },
    async charge(
      paymentInfo: PaymentInfo,
      amount: bigint,
      tokenCollector: Address,
      collectorData: Hex,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreCharge(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
      })
    },
    async release(paymentInfo: PaymentInfo, amount: bigint): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreRelease(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
      })
    },
    async getState(paymentInfo: PaymentInfo) {
      return getPaymentState(config.publicClient, {
        operatorAddress: config.operatorAddress,
        chainId: config.chainId,
        paymentInfo,
      })
    },
    async getAmounts(paymentInfo: PaymentInfo) {
      return getPaymentAmounts(config.publicClient, {
        operatorAddress: config.operatorAddress,
        chainId: config.chainId,
        paymentInfo,
      })
    },
  }
}
