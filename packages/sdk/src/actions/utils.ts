import { ValidationError } from '@x402r/core'
import type { WalletClient } from 'viem'
import type { ResolvedConfig } from '../types.js'

export function requireWallet(config: ResolvedConfig): WalletClient {
  if (!config.walletClient)
    throw new ValidationError('walletClient is required for write operations')
  return config.walletClient
}
