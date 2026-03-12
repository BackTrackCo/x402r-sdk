import type { Address } from 'viem'
import { createEscrowActions } from '../actions/escrow.js'
import { createFreezeActions } from '../actions/freeze.js'
import type { X402r } from '../types.js'

/** Extend plugin — attaches escrow actions for the given EscrowPeriod address. */
export function escrowPeriodActions(escrowPeriodAddress: Address) {
  return (client: X402r) => ({
    escrow: createEscrowActions(
      { ...client.config, escrowPeriodAddress },
      escrowPeriodAddress,
    ),
  })
}

/** Extend plugin — attaches freeze actions for the given Freeze address. */
export function freezeActions(freezeAddress: Address) {
  return (client: X402r) => ({
    freeze: createFreezeActions(
      { ...client.config, freezeAddress },
      freezeAddress,
    ),
  })
}
