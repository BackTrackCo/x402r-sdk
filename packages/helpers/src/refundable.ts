import { getNetworkConfig, SupportedNetworks } from '@x402r/core/config';
import type { PaymentOption, RefundableOptions, EscrowExtra } from './types.js';

/**
 * Marks a payment option as refundable by adding escrow configuration.
 *
 * Automatically populates escrowAddress and tokenCollector from network config.
 *
 * @param option - The base payment option (must include network)
 * @param operatorAddress - The PaymentOperator contract address
 * @param options - Optional overrides and configuration
 * @returns Payment option with populated extra field
 * @throws Error if network is not supported
 *
 * @example
 * ```typescript
 * import { refundable } from '@x402r/helpers';
 *
 * const option = refundable({
 *   scheme: 'escrow',
 *   network: 'eip155:84532',
 *   payTo: '0xMerchant...',
 *   price: '$0.01',
 * }, '0xOperator...');
 *
 * // Result:
 * // {
 * //   scheme: 'escrow',
 * //   network: 'eip155:84532',
 * //   payTo: '0xMerchant...',
 * //   price: '$0.01',
 * //   extra: {
 * //     escrowAddress: '0xb9488351E48b23D798f24e8174514F28B741Eb4f',
 * //     operatorAddress: '0xOperator...',
 * //     tokenCollector: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
 * //     minFeeBps: 0,      // Default: accept 0% min fee
 * //     maxFeeBps: 1000,   // Default: accept up to 10% fee
 * //   }
 * // }
 * ```
 */
export function refundable<T extends PaymentOption>(
  option: T,
  operatorAddress: `0x${string}`,
  options?: RefundableOptions,
): T & { extra: EscrowExtra } {
  const networkConfig = getNetworkConfig(option.network);

  if (!networkConfig) {
    throw new Error(
      `Unsupported network: ${option.network}. ` +
        `Supported: ${SupportedNetworks.join(', ')}`,
    );
  }

  const extra: EscrowExtra = {
    escrowAddress: options?.escrowAddress ?? networkConfig.authCaptureEscrow,
    operatorAddress,
    tokenCollector: options?.tokenCollector ?? networkConfig.tokenCollector,
    // Fee defaults: 0% min, 10% max (1000 bps) - reasonable for most use cases
    minFeeBps: options?.minFeeBps ?? 0,
    maxFeeBps: options?.maxFeeBps ?? 1000,
  };

  // Add optional fields if provided
  if (options?.escrowPeriod !== undefined) {
    extra.refundExpirySeconds = options.escrowPeriod;
  }
  if (options?.tokenName !== undefined) {
    extra.name = options.tokenName;
  }
  if (options?.tokenVersion !== undefined) {
    extra.version = options.tokenVersion;
  }
  if (options?.feeReceiver !== undefined) {
    extra.feeReceiver = options.feeReceiver;
  }

  return {
    ...option,
    extra: {
      ...option.extra,
      ...extra,
    },
  } as T & { extra: EscrowExtra };
}
