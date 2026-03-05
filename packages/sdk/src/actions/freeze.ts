import { freezePayment, isFrozen, unfreezePayment } from '@x402r/core'
import type { FreezeActions, ResolvedConfig } from '../types.js'
import { requireWalletClient } from './guards.js'

export function createFreezeActions(config: ResolvedConfig): FreezeActions {
  const { publicClient } = config

  return {
    isFrozen(freezeAddress, paymentInfo) {
      return isFrozen(publicClient, freezeAddress, paymentInfo)
    },

    freeze(freezeAddress, paymentInfo) {
      const wc = requireWalletClient(config, 'freeze.freeze')
      return freezePayment(wc, freezeAddress, paymentInfo)
    },

    unfreeze(freezeAddress, paymentInfo) {
      const wc = requireWalletClient(config, 'freeze.unfreeze')
      return unfreezePayment(wc, freezeAddress, paymentInfo)
    },
  }
}
