import {
  authorize,
  charge,
  getPaymentAmounts,
  refundInEscrow,
  refundPostEscrow,
  release,
} from '@x402r/core'
import type { Address, Hex } from 'viem'
import type { PaymentActions, ResolvedConfig } from '../types.js'
import { requireWalletClient } from './guards.js'

export function createPaymentActions(config: ResolvedConfig): PaymentActions {
  const { publicClient, operatorAddress, chainId, chainConfig } = config

  return {
    getState(paymentInfo) {
      return getPaymentAmounts(
        publicClient,
        operatorAddress,
        chainId,
        paymentInfo,
      )
    },

    getAmounts(paymentInfo) {
      return getPaymentAmounts(
        publicClient,
        operatorAddress,
        chainId,
        paymentInfo,
      )
    },

    authorize(
      paymentInfo,
      amount,
      tokenCollector?: Address,
      collectorData?: Hex,
    ) {
      const wc = requireWalletClient(config, 'payment.authorize')
      return authorize(
        wc,
        operatorAddress,
        paymentInfo,
        amount,
        tokenCollector ?? chainConfig.tokenCollector,
        collectorData ?? '0x',
      )
    },

    charge(paymentInfo, amount, tokenCollector?: Address, collectorData?: Hex) {
      const wc = requireWalletClient(config, 'payment.charge')
      return charge(
        wc,
        operatorAddress,
        paymentInfo,
        amount,
        tokenCollector ?? chainConfig.tokenCollector,
        collectorData ?? '0x',
      )
    },

    release(paymentInfo, amount) {
      const wc = requireWalletClient(config, 'payment.release')
      return release(wc, operatorAddress, paymentInfo, amount)
    },

    refundInEscrow(paymentInfo, amount) {
      const wc = requireWalletClient(config, 'payment.refundInEscrow')
      return refundInEscrow(wc, operatorAddress, paymentInfo, amount)
    },

    refundPostEscrow(
      paymentInfo,
      amount,
      tokenCollector?: Address,
      collectorData?: Hex,
    ) {
      const wc = requireWalletClient(config, 'payment.refundPostEscrow')
      return refundPostEscrow(
        wc,
        operatorAddress,
        paymentInfo,
        amount,
        tokenCollector ?? chainConfig.tokenCollector,
        collectorData ?? '0x',
      )
    },
  }
}
