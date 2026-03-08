import type { PaymentInfo } from '@x402r/core'
import {
  calculateTotalFees,
  calculateOperatorFeeBps as coreCalcOperatorFeeBps,
  calculateProtocolFeeBps as coreCalcProtocolFeeBps,
  distributeFees as coreDistributeFees,
  getAccumulatedProtocolFees as coreGetAccumulatedProtocolFees,
  getAuthorizedFees as coreGetAuthorizedFees,
  getFeeAddresses as coreGetFeeAddresses,
  getOperatorConfig,
} from '@x402r/core'
import type { Address, Hash, Hex } from 'viem'
import { zeroAddress } from 'viem'
import type { OperatorActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createOperatorActions(config: ResolvedConfig): OperatorActions {
  const caller = config.walletClient?.account?.address ?? zeroAddress

  return {
    async getConfig() {
      return getOperatorConfig(config.publicClient, {
        operatorAddress: config.operatorAddress,
      })
    },
    async getFeeAddresses() {
      return coreGetFeeAddresses(config.publicClient, {
        operatorAddress: config.operatorAddress,
      })
    },
    async calculateFees(paymentInfo: PaymentInfo, amount: bigint) {
      return calculateTotalFees(config.publicClient, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        caller,
      })
    },
    async calculateOperatorFeeBps(paymentInfo: PaymentInfo, amount: bigint) {
      return coreCalcOperatorFeeBps(config.publicClient, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        caller,
      })
    },
    async calculateProtocolFeeBps(paymentInfo: PaymentInfo, amount: bigint) {
      return coreCalcProtocolFeeBps(config.publicClient, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        caller,
      })
    },
    async getAuthorizedFees(paymentInfoHash: Hex) {
      return coreGetAuthorizedFees(config.publicClient, {
        operatorAddress: config.operatorAddress,
        paymentInfoHash,
      })
    },
    async getAccumulatedProtocolFees(token: Address) {
      return coreGetAccumulatedProtocolFees(config.publicClient, {
        operatorAddress: config.operatorAddress,
        token,
      })
    },
    async distributeFees(token: Address): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreDistributeFees(wallet, {
        operatorAddress: config.operatorAddress,
        token,
      })
    },
  }
}
