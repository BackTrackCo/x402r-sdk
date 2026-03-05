import {
  getConditionAddress,
  getEscrowAddress,
  getOperatorConfig,
} from '@x402r/core'
import type { OperatorActions, ResolvedConfig } from '../types.js'

export function createOperatorActions(config: ResolvedConfig): OperatorActions {
  const { publicClient, operatorAddress } = config

  return {
    getConfig() {
      return getOperatorConfig(publicClient, operatorAddress)
    },

    getEscrowAddress() {
      return getEscrowAddress(publicClient, operatorAddress)
    },

    getConditionAddress(slot) {
      return getConditionAddress(publicClient, operatorAddress, slot)
    },
  }
}
