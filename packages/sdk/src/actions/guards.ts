import { ConfigError } from '@x402r/core'
import type { Address, WalletClient } from 'viem'
import type { ResolvedConfig } from '../types.js'

export function requireWalletClient(
  config: ResolvedConfig,
  operation: string,
): WalletClient {
  if (!config.walletClient) {
    throw new ConfigError(`walletClient is required for ${operation}`, {
      metaMessages: [
        'Pass a walletClient when creating the client:',
        '  createX402r({ publicClient, walletClient, operatorAddress })',
      ],
    })
  }
  return config.walletClient
}

export function requireEvidenceAddress(
  config: ResolvedConfig,
  operation: string,
): Address {
  const addr = config.chainConfig.refundRequestEvidence
  if (!addr) {
    throw new ConfigError(
      `Evidence contract not available on ${config.chainConfig.name} for ${operation}`,
      {
        metaMessages: [
          `Chain ${config.chainId} does not have a refundRequestEvidence contract deployed.`,
          'Use @x402r/core directly if you need to specify a custom address.',
        ],
      },
    )
  }
  return addr
}
