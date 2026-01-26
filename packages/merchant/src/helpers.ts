/**
 * Server helpers for adding refund capabilities to x402 payment options
 * @module helpers
 */

/**
 * X402r extension metadata for refundable payments
 */
export interface X402rMetadata {
  /** PaymentOperator contract address */
  operator: `0x${string}`;
  /** Escrow period in seconds (optional) */
  escrowPeriod?: number;
  /** RefundRequest contract address (optional) */
  refundRequestAddress?: `0x${string}`;
}

/**
 * Payment option with x402r refund metadata
 */
export interface PaymentOption {
  scheme: string;
  network: string;
  token: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  x402r?: X402rMetadata;
  [key: string]: unknown;
}

/**
 * Route configuration for payment-protected endpoints
 */
export interface RouteConfig {
  paymentOptions: PaymentOption[];
  [key: string]: unknown;
}

/**
 * Routes configuration mapping paths to route configs
 */
export interface RoutesConfig {
  [path: string]: RouteConfig;
}

/**
 * Options for refundable payments
 */
export interface RefundableOptions {
  /** Escrow period in seconds */
  escrowPeriod?: number;
  /** RefundRequest contract address */
  refundRequestAddress?: `0x${string}`;
}

/**
 * Mark a payment option as refundable by adding x402r metadata
 *
 * This adds the necessary metadata to route payments through the
 * PaymentOperator for refund support.
 *
 * @param option - The payment option to make refundable
 * @param operatorAddress - The PaymentOperator contract address
 * @param options - Additional refundable options
 * @returns The payment option with x402r metadata added
 *
 * @example
 * ```typescript
 * import { refundable } from '@x402r/merchant';
 *
 * const option = refundable({
 *   scheme: 'evm',
 *   network: 'base-sepolia',
 *   token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
 *   maxAmountRequired: '1000000',
 *   resource: '/api/resource',
 * }, '0x...operatorAddress');
 * ```
 */
export function refundable<T extends PaymentOption>(
  option: T,
  operatorAddress: `0x${string}`,
  options?: RefundableOptions
): T & { x402r: X402rMetadata } {
  const x402r: X402rMetadata = {
    operator: operatorAddress,
  };

  if (options?.escrowPeriod !== undefined) {
    x402r.escrowPeriod = options.escrowPeriod;
  }

  if (options?.refundRequestAddress !== undefined) {
    x402r.refundRequestAddress = options.refundRequestAddress;
  }

  return {
    ...option,
    x402r,
  };
}

/**
 * Add x402r refund metadata to all payment options in a routes configuration
 *
 * This is a convenience wrapper that applies refundable() to all payment
 * options across all routes.
 *
 * @param routes - The routes configuration object
 * @param operatorAddress - The PaymentOperator contract address
 * @param options - Additional refundable options
 * @returns The routes config with x402r metadata added to all payment options
 *
 * @example
 * ```typescript
 * import { withRefund } from '@x402r/merchant';
 *
 * const routes = withRefund({
 *   '/api/resource': {
 *     paymentOptions: [{
 *       scheme: 'evm',
 *       network: 'base-sepolia',
 *       token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
 *       maxAmountRequired: '1000000',
 *       resource: '/api/resource',
 *     }],
 *   },
 * }, '0x...operatorAddress');
 * ```
 */
export function withRefund<T extends RoutesConfig>(
  routes: T,
  operatorAddress: `0x${string}`,
  options?: RefundableOptions
): T {
  const result: RoutesConfig = {};

  for (const [path, routeConfig] of Object.entries(routes)) {
    result[path] = {
      ...routeConfig,
      paymentOptions: routeConfig.paymentOptions.map((option) =>
        refundable(option, operatorAddress, options)
      ),
    };
  }

  return result as T;
}
