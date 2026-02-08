/**
 * EscrowExtra - matches x402r-scheme's EscrowExtra interface
 * These fields populate PaymentRequirements.extra
 */
export interface EscrowExtra {
  [key: string]: unknown;
  escrowAddress: `0x${string}`;
  operatorAddress: `0x${string}`;
  tokenCollector: `0x${string}`;
  /** Refund window in seconds */
  refundExpirySeconds?: number;
  /** Pre-approval expiry in seconds */
  preApprovalExpirySeconds?: number;
  /** Authorization expiry in seconds */
  authorizationExpirySeconds?: number;
  /** Minimum fee in basis points */
  minFeeBps?: number;
  /** Maximum fee in basis points */
  maxFeeBps?: number;
  /** Token name for ERC-3009 */
  name?: string;
  /** Token version for ERC-3009 */
  version?: string;
}

/**
 * Payment option for x402 protocol
 */
export interface PaymentOption {
  scheme: string;
  network: string;
  payTo?: `0x${string}`;
  price?: string;
  asset?: `0x${string}`;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Options for refundable()
 */
export interface RefundableOptions {
  /** Override escrow address (defaults to network config) */
  escrowAddress?: `0x${string}`;
  /** Override token collector (defaults to network config) */
  tokenCollector?: `0x${string}`;
  /** Minimum acceptable fee in basis points (e.g., 0 = 0%) */
  minFeeBps?: number;
  /** Maximum acceptable fee in basis points (e.g., 500 = 5%) */
  maxFeeBps?: number;
}
