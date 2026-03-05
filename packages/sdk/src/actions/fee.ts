import {
  calculateTotalFees,
  distributeFees,
  getFeeAddresses,
} from '@x402r/core'
import type { FeeActions, ResolvedConfig } from '../types.js'
import { requireWalletClient } from './guards.js'

export function createFeeActions(config: ResolvedConfig): FeeActions {
  const { publicClient, operatorAddress } = config

  return {
    getAddresses() {
      return getFeeAddresses(publicClient, operatorAddress)
    },

    calculate(paymentInfo, amount, caller) {
      return calculateTotalFees(
        publicClient,
        operatorAddress,
        paymentInfo,
        amount,
        caller,
      )
    },

    distribute(token) {
      const wc = requireWalletClient(config, 'fee.distribute')
      return distributeFees(wc, operatorAddress, token)
    },
  }
}
