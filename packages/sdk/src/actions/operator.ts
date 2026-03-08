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
  ValidationError,
} from '@x402r/core'
import type { Address, Hash, Hex, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import type { OperatorActions, ResolvedConfig } from '../types.js'

function requireWallet(config: ResolvedConfig): WalletClient {
  if (!config.walletClient)
    throw new ValidationError('walletClient is required for write operations')
  return config.walletClient
}

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
