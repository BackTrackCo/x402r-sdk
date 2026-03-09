import { ValidationError } from '@x402r/core'
import { createX402r } from './client.js'
import type {
  ArbiterClient,
  MerchantClient,
  PayerClient,
  X402rConfig,
} from './types.js'

/**
 * Create a payer-scoped client with type-narrowed action groups.
 *
 * Requires `walletClient` — use `createX402r()` for read-only access or dual-role wallets.
 * Type narrowing is a DX improvement only, not a runtime security boundary.
 */
export function createPayerClient(config: X402rConfig): PayerClient {
  if (!config.walletClient) {
    throw new ValidationError('walletClient is required for createPayerClient')
  }
  // X402r.extend returns this & T scoped to X402r; preset extend scopes to the narrowed type — cast required
  return createX402r(config) as unknown as PayerClient
}

/**
 * Create a merchant-scoped client with type-narrowed action groups.
 *
 * Requires `walletClient` — use `createX402r()` for read-only access or dual-role wallets.
 * Type narrowing is a DX improvement only, not a runtime security boundary.
 */
export function createMerchantClient(config: X402rConfig): MerchantClient {
  if (!config.walletClient) {
    throw new ValidationError(
      'walletClient is required for createMerchantClient',
    )
  }
  // X402r.extend returns this & T scoped to X402r; preset extend scopes to the narrowed type — cast required
  return createX402r(config) as unknown as MerchantClient
}

/**
 * Create an arbiter-scoped client with type-narrowed action groups.
 *
 * Requires `walletClient` — use `createX402r()` for read-only access or dual-role wallets.
 * Type narrowing is a DX improvement only, not a runtime security boundary.
 */
export function createArbiterClient(config: X402rConfig): ArbiterClient {
  if (!config.walletClient) {
    throw new ValidationError(
      'walletClient is required for createArbiterClient',
    )
  }
  // X402r.extend returns this & T scoped to X402r; preset extend scopes to the narrowed type — cast required
  return createX402r(config) as unknown as ArbiterClient
}
