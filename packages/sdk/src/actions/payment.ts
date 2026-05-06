import type { PaymentInfo } from '@x402r/core'
import {
  approveRefundAllowance as coreApproveRefundAllowance,
  authorize as coreAuthorize,
  capture as coreCapture,
  charge as coreCharge,
  getRefundAllowance as coreGetRefundAllowance,
  refund as coreRefund,
  voidPayment as coreVoidPayment,
  getPaymentAmounts,
  getPaymentState,
} from '@x402r/core'
import type { Address, Hash, Hex } from 'viem'
import type { PaymentActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createPaymentActions(config: ResolvedConfig): PaymentActions {
  return {
    /** Collects tokens into escrow. Use `capture()` to claim after escrow period. Mutually exclusive with `charge()`. */
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
    /** Direct charge — collects and immediately distributes to receiver. No escrow hold. Mutually exclusive with `authorize()`. */
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
    async capture(
      paymentInfo: PaymentInfo,
      amount: bigint,
      data?: Hex,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreCapture(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        data,
      })
    },
    async voidPayment(paymentInfo: PaymentInfo, data?: Hex): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreVoidPayment(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        data,
      })
    },
    async refund(
      paymentInfo: PaymentInfo,
      amount: bigint,
      tokenCollector: Address,
      collectorData: Hex,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreRefund(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
      })
    },
    async approveRefundAllowance(
      token: Address,
      amount: bigint,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreApproveRefundAllowance(wallet, {
        token,
        collectorAddress: config.chainConfig.receiverRefundCollector,
        amount,
      })
    },
    async getRefundAllowance(token: Address, owner: Address): Promise<bigint> {
      return coreGetRefundAllowance(config.publicClient, {
        token,
        owner,
        collectorAddress: config.chainConfig.receiverRefundCollector,
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
