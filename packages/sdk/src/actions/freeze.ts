import type { PaymentInfo } from '@x402r/core'
import {
  isFrozen as coreIsFrozen,
  freezePayment,
  unfreezePayment,
} from '@x402r/core'
import type { Hash } from 'viem'
import type { FreezeActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

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
