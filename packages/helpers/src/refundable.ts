import { getNetworkConfig, SupportedNetworks } from '@x402r/core/config';
import type { PaymentOption, RefundableOptions, EscrowExtra } from './types.js';

/**
 * Marks a payment option as refundable by adding escrow configuration.
 *
 * Automatically populates escrowAddress, tokenCollector, and fee bounds from
 * network config and sensible defaults.
 *
 * @param option - The base payment option (must include network)
 * @param operatorAddress - The PaymentOperator contract address
 * @param options - Optional overrides and configuration
 * @returns Payment option with populated extra field
 * @throws Error if network is not supported
 *
 * ## Options & Defaults
 *
 * | Option | Default | Description |
 * |--------|---------|-------------|
 * | `escrowAddress` | From network config | AuthCaptureEscrow contract |
 * | `tokenCollector` | From network config | ERC3009PaymentCollector contract |
 * | `minFeeBps` | `0` | Minimum acceptable fee (0% = accept zero fees) |
 * | `maxFeeBps` | `1000` | Maximum acceptable fee (1000 bps = 10%) |
 * | `feeReceiver` | `undefined` → operator | Address that receives fees |
 * | `escrowPeriod` | `undefined` → no expiry | Refund window in seconds |
 * | `tokenName` | `undefined` | Token name for ERC-3009 (e.g., "USDC") |
 * | `tokenVersion` | `undefined` | Token version for ERC-3009 (e.g., "2") |
 *
 * @example Basic usage (with defaults)
 * ```typescript
 * import { refundable } from '@x402r/helpers';
 *
 * const option = refundable({
 *   scheme: 'escrow',
 *   network: 'eip155:84532',
 *   payTo: '0xMerchant...',
 *   price: '$0.01',
 * }, '0xOperator...');
 * // → minFeeBps: 0, maxFeeBps: 1000 (defaults applied)
 * ```
 *
 * @example With custom configuration
 * ```typescript
 * const option = refundable({
 *   scheme: 'escrow',
 *   network: 'eip155:84532',
 *   payTo: '0xMerchant...',
 *   price: '$0.01',
 * }, '0xOperator...', {
 *   escrowPeriod: 86400,              // 1 day refund window
 *   maxFeeBps: 500,                   // Accept up to 5% fee
 *   feeReceiver: '0xTreasury...',     // Fees go to treasury
 *   tokenName: 'USDC',
 *   tokenVersion: '2',
 * });
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
