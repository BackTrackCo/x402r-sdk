import type { Address } from 'viem'
import { createEscrowActions } from '../actions/escrow.js'
import { createFreezeActions } from '../actions/freeze.js'
import { createQueryActions } from '../actions/query.js'
import type { PaymentStore } from '../store/types.js'
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

/** Extend plugin — attaches query actions for the given PaymentIndexRecorder address. */
export function queryActions(recorderAddress: Address, store?: PaymentStore) {
  return (client: X402r) => ({
    query: createQueryActions(
      {
        ...client.config,
        paymentIndexRecorderAddress: recorderAddress,
        paymentStore: store,
      },
      recorderAddress,
    ),
  })
}
