import { fromNetworkId, getChainConfig } from '@x402r/core/config'
import { ValidationError } from '@x402r/core/errors'
import type { EscrowExtra } from '@x402r/evm'
import type { PaymentOption, RefundableOptions } from './types.js'

// Base type from scheme — drift in shared fields becomes a compile error.
// `settlementMethod` is added locally until @x402r/evm publishes it.
type HelperExtra = Omit<EscrowExtra, 'name' | 'version'> & {
  settlementMethod: 'authorize' | 'charge'
}

/**
 * Augments a payment option with the escrow `extra` fields required by the
 * x402r refundable-payment scheme.
 *
 * Addresses default to the on-chain config for the option's network; callers
 * can override via `options`.
 *
 * @example
 * ```ts
 * import { refundable } from '@x402r/helpers'
 *
 * const option = refundable(
 *   { scheme: 'escrow', network: 'eip155:84532', price: '$0.01' },
 *   '0xMyOperator…',
 * )
 * ```
 */
export function refundable<T extends PaymentOption>(
  option: T,
  operatorAddress: `0x${string}`,
  options?: RefundableOptions,
): T & { extra: HelperExtra } {
  const minFeeBps = options?.minFeeBps ?? 0
  const maxFeeBps = options?.maxFeeBps ?? 1000

  // --- Validation --------------------------------------------------------
  if (minFeeBps < 0 || minFeeBps > 10_000) {
    throw new ValidationError(
      `minFeeBps must be between 0 and 10000, got ${minFeeBps}`,
    )
  }
  if (maxFeeBps < 0 || maxFeeBps > 10_000) {
    throw new ValidationError(
      `maxFeeBps must be between 0 and 10000, got ${maxFeeBps}`,
    )
  }
  if (minFeeBps > maxFeeBps) {
    throw new ValidationError(
      `minFeeBps (${minFeeBps}) must be <= maxFeeBps (${maxFeeBps})`,
    )
  }

  if (
    options?.postCaptureRefundDeadline !== undefined &&
    options.postCaptureRefundDeadline <= 0
  ) {
    throw new ValidationError('postCaptureRefundDeadline must be positive')
  }

  // --- Config lookup -----------------------------------------------------
  const chainId = fromNetworkId(option.network)
  const chainConfig = getChainConfig(chainId)

  const extra: HelperExtra = {
    escrowAddress: options?.escrowAddress ?? chainConfig.authCaptureEscrow,
    operatorAddress,
    tokenCollector: options?.tokenCollector ?? chainConfig.tokenCollector,
    minFeeBps,
    maxFeeBps,
    settlementMethod: options?.settlementMethod ?? 'authorize',
  }

  if (options?.postCaptureRefundDeadline !== undefined) {
    extra.refundExpirySeconds =
      Math.floor(Date.now() / 1000) + options.postCaptureRefundDeadline
  }

  return {
    ...option,
    extra: { ...option.extra, ...extra },
  } as T & { extra: HelperExtra }
}
