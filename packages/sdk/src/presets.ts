import { ValidationError } from '@x402r/core'
import { createX402r } from './client.js'
import type {
  ArbiterClient,
  MerchantClient,
  PayerClient,
  X402rConfig,
} from './types.js'

export function createPayerClient(config: X402rConfig): PayerClient {
  if (!config.walletClient) {
    throw new ValidationError('walletClient is required for createPayerClient')
  }
  return createX402r(config) as unknown as PayerClient
}

export function createMerchantClient(config: X402rConfig): MerchantClient {
  if (!config.walletClient) {
    throw new ValidationError(
      'walletClient is required for createMerchantClient',
    )
  }
  return createX402r(config) as unknown as MerchantClient
}

export function createArbiterClient(config: X402rConfig): ArbiterClient {
  if (!config.walletClient) {
    throw new ValidationError(
      'walletClient is required for createArbiterClient',
    )
  }
  return createX402r(config) as unknown as ArbiterClient
}
