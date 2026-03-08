import type { PaymentInfo } from '@x402r/core'
import {
  isFrozen as coreIsFrozen,
  freezePayment,
  unfreezePayment,
  ValidationError,
} from '@x402r/core'
import type { Hash, WalletClient } from 'viem'
import type { FreezeActions, ResolvedConfig } from '../types.js'

function requireWallet(config: ResolvedConfig): WalletClient {
  if (!config.walletClient)
    throw new ValidationError('walletClient is required for write operations')
  return config.walletClient
}

export function createFreezeActions(config: ResolvedConfig): FreezeActions {
  const freezeAddress = config.freezeAddress!
  return {
    async freeze(paymentInfo: PaymentInfo): Promise<Hash> {
      const wallet = requireWallet(config)
      return freezePayment(wallet, { freezeAddress, paymentInfo })
    },
    async unfreeze(paymentInfo: PaymentInfo): Promise<Hash> {
      const wallet = requireWallet(config)
      return unfreezePayment(wallet, { freezeAddress, paymentInfo })
    },
    async isFrozen(paymentInfo: PaymentInfo) {
      return coreIsFrozen(config.publicClient, { freezeAddress, paymentInfo })
    },
  }
}
