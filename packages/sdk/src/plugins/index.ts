import { getErc8004Addresses } from '@x402r/erc8004'
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
  return (client: X402r) => {
    const addresses = getErc8004Addresses(client.config.chainId)
    const resolved: Erc8004PluginOptions = {
      ...options,
      registryAddress: options?.registryAddress ?? addresses.identityRegistry,
      reputationRegistryAddress:
        options?.reputationRegistryAddress ?? addresses.reputationRegistry,
    }
    return {
      identity: createErc8004IdentityActions(client.config, resolved),
      reputation: createErc8004ReputationActions(client.config, resolved),
      discovery: createErc8004DiscoveryActions(client.config, resolved),
    }
  }
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

/** Extend plugin — attaches query actions for the given PaymentIndexHook address. */
export function queryActions(
  hookAddress: Address,
  options?: { store?: PaymentStore; eventFromBlock?: bigint },
) {
  return (client: X402r) => ({
    query: createQueryActions(
      {
        ...client.config,
        paymentIndexHookAddress: hookAddress,
        paymentStore: options?.store,
        eventFromBlock: options?.eventFromBlock,
      },
      hookAddress,
    ),
  })
}
