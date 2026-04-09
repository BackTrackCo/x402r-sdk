import type { Address } from 'viem'
import {
  createErc8004DiscoveryActions,
  createErc8004IdentityActions,
  createErc8004ReputationActions,
} from '../actions/erc8004.js'
import { createEscrowActions } from '../actions/escrow.js'
import { createFreezeActions } from '../actions/freeze.js'
import { createQueryActions } from '../actions/query.js'
import type { PaymentStore } from '../store/types.js'
import type { Erc8004PluginOptions, X402r } from '../types.js'

/** Extend plugin — attaches ERC-8004 identity, reputation, and discovery actions. */
export function erc8004Actions(options?: Erc8004PluginOptions) {
  return (client: X402r) => ({
    identity: createErc8004IdentityActions(client.config, options),
    reputation: createErc8004ReputationActions(client.config, options),
    discovery: createErc8004DiscoveryActions(client.config, options),
  })
}

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
export function queryActions(
  recorderAddress: Address,
  options?: { store?: PaymentStore; eventFromBlock?: bigint },
) {
  return (client: X402r) => ({
    query: createQueryActions(
      {
        ...client.config,
        paymentIndexRecorderAddress: recorderAddress,
        paymentStore: options?.store,
        eventFromBlock: options?.eventFromBlock,
      },
      recorderAddress,
    ),
  })
}
