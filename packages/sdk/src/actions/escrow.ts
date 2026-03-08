import type { PaymentInfo } from '@x402r/core'
import {
  getAuthorizationTime,
  getEscrowPeriodDuration,
  isDuringEscrowPeriod,
} from '@x402r/core'
import type { EscrowActions, ResolvedConfig } from '../types.js'

export function createEscrowActions(config: ResolvedConfig): EscrowActions {
  const escrowPeriodAddress = config.escrowPeriodAddress!
  return {
    async isDuringEscrow(paymentInfo: PaymentInfo) {
      return isDuringEscrowPeriod(config.publicClient, {
        escrowPeriodAddress,
        paymentInfo,
      })
    },
    async getAuthorizationTime(paymentInfo: PaymentInfo) {
      return getAuthorizationTime(config.publicClient, {
        escrowPeriodAddress,
        paymentInfo,
      })
    },
    async getDuration() {
      return getEscrowPeriodDuration(config.publicClient, {
        escrowPeriodAddress,
      })
    },
  }
}
