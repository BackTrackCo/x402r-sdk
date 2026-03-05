import { ConfigError, getChainConfig } from '@x402r/core'
import type { ResolvedConfig, X402rConfig } from './types.js'

export function resolveConfig(config: X402rConfig): ResolvedConfig {
  const { publicClient, walletClient, operatorAddress } = config

  const chain = publicClient.chain
  if (!chain) {
    throw new ConfigError('publicClient must have a chain configured', {
      metaMessages: [
        'Create your public client with a chain: createPublicClient({ chain: baseSepolia, ... })',
      ],
    })
  }

  const chainId = chain.id
  const chainConfig = getChainConfig(chainId)

  return {
    publicClient,
    walletClient,
    operatorAddress,
    chainId,
    chainConfig,
  }
}
