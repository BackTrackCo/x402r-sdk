import type { PaymentInfo } from '@x402r/core'
import {
  isFrozen as coreIsFrozen,
  freezePayment,
  unfreezePayment,
} from '@x402r/core'
import type { Address, Hash, Hex } from 'viem'
import type { FreezeActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createFreezeActions(
  config: ResolvedConfig,
  freezeAddress: Address,
): FreezeActions {
  return {
    async freeze(paymentInfo: PaymentInfo, data?: Hex): Promise<Hash> {
      const wallet = requireWallet(config)
      return freezePayment(wallet, { freezeAddress, paymentInfo, data })
    },
    async unfreeze(paymentInfo: PaymentInfo, data?: Hex): Promise<Hash> {
      const wallet = requireWallet(config)
      return unfreezePayment(wallet, { freezeAddress, paymentInfo, data })
    },
    async isFrozen(paymentInfo: PaymentInfo) {
      return coreIsFrozen(config.publicClient, { freezeAddress, paymentInfo })
    },
  }
}
