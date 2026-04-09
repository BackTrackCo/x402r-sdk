import {
  isRegistered as coreIsRegistered,
  resolveAgent as coreResolveAgent,
  verifyAgentId as coreVerifyAgentId,
  registerAgent,
} from '@x402r/erc8004/identity'
import { resolveServiceEndpoint as coreResolveServiceEndpoint } from '@x402r/erc8004/registration'
import {
  getSummary as coreGetSummary,
  giveFeedback as coreGiveFeedback,
} from '@x402r/erc8004/reputation'
import type { Address, Hash } from 'viem'
import type {
  Erc8004DiscoveryActions,
  Erc8004GiveFeedbackParams,
  Erc8004IdentityActions,
  Erc8004PluginOptions,
  Erc8004ReputationActions,
  ResolvedConfig,
} from '../types.js'
import { requireWallet } from './utils.js'

export const DEFAULT_FEEDBACK_TAG1 = 'starred'
export const DEFAULT_FEEDBACK_TAG2 = 'x402'

export function createErc8004IdentityActions(
  config: ResolvedConfig,
  options?: Erc8004PluginOptions,
): Erc8004IdentityActions {
  const registryAddress = options?.registryAddress
  return {
    async register(agentURI?: string): Promise<Hash> {
      const wallet = requireWallet(config)
      return registerAgent(wallet, { agentURI, registryAddress })
    },
    async verifyAgentId(
      agentId: bigint,
      claimedAddress: Address,
    ): Promise<boolean> {
      return coreVerifyAgentId(config.publicClient, {
        agentId,
        claimedAddress,
        registryAddress,
      })
    },
    async resolveAgent(agentId: bigint) {
      return coreResolveAgent(config.publicClient, {
        agentId,
        registryAddress,
      })
    },
    async isRegistered(address: Address): Promise<boolean> {
      return coreIsRegistered(config.publicClient, {
        address,
        registryAddress,
      })
    },
  }
}

export function createErc8004ReputationActions(
  config: ResolvedConfig,
  options?: Erc8004PluginOptions,
): Erc8004ReputationActions {
  const registryAddress = options?.reputationRegistryAddress
  const tag1 = options?.defaultTag1 ?? DEFAULT_FEEDBACK_TAG1
  const tag2 = options?.defaultTag2 ?? DEFAULT_FEEDBACK_TAG2
  return {
    async rate(agentId: bigint, score: number): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreGiveFeedback(wallet, {
        agentId,
        value: BigInt(score),
        valueDecimals: 0,
        tag1,
        tag2,
        registryAddress,
      })
    },
    async getSummary(
      agentId: bigint,
      reviewers: readonly Address[],
      opts?: { tag1?: string; tag2?: string },
    ) {
      return coreGetSummary(config.publicClient, {
        agentId,
        clientAddresses: reviewers,
        tag1: opts?.tag1 ?? tag1,
        tag2: opts?.tag2 ?? tag2,
        registryAddress,
      })
    },
    async giveFeedback(
      agentId: bigint,
      params: Erc8004GiveFeedbackParams,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreGiveFeedback(wallet, {
        agentId,
        ...params,
        registryAddress,
      })
    },
  }
}

export function createErc8004DiscoveryActions(
  config: ResolvedConfig,
  options?: Erc8004PluginOptions,
): Erc8004DiscoveryActions {
  const registryAddress = options?.registryAddress
  return {
    async resolveServiceEndpoint(agentId: bigint, serviceName: string) {
      return coreResolveServiceEndpoint(config.publicClient, {
        agentId,
        serviceName,
        registryAddress,
      })
    },
  }
}
