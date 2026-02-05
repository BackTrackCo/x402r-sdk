/**
 * Shared utilities for CLI examples
 */

import type { PaymentInfo } from '@x402r/core';

/**
 * Parse a PaymentInfo JSON string into a typed PaymentInfo object.
 *
 * Uses BigInt() for all bigint-typed fields (maxAmount, preApprovalExpiry,
 * authorizationExpiry, refundExpiry, salt) to avoid precision loss from Number().
 */
export function parsePaymentInfo(json: string): PaymentInfo {
  try {
    const parsed = JSON.parse(json);
    return {
      operator: parsed.operator,
      payer: parsed.payer,
      receiver: parsed.receiver,
      token: parsed.token,
      maxAmount: BigInt(parsed.maxAmount),
      preApprovalExpiry: BigInt(parsed.preApprovalExpiry),
      authorizationExpiry: BigInt(parsed.authorizationExpiry),
      refundExpiry: BigInt(parsed.refundExpiry),
      minFeeBps: Number(parsed.minFeeBps),
      maxFeeBps: Number(parsed.maxFeeBps),
      feeReceiver: parsed.feeReceiver,
      salt: BigInt(parsed.salt),
    };
  } catch {
    console.error('Error: Invalid payment JSON');
    console.error('Expected format: {"operator":"0x...","payer":"0x...",...}');
    process.exit(1);
  }
}

/**
 * Format an address for compact display: first 10 chars + "..." + last 8 chars
 */
export function shortAddress(address: string): string {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

/**
 * Format a USDC amount (6 decimals) for display
 */
export function formatUSDC(amount: bigint): string {
  const decimals = 6;
  const whole = amount / BigInt(10 ** decimals);
  const fractional = amount % BigInt(10 ** decimals);
  return `${whole}.${fractional.toString().padStart(decimals, '0')} USDC`;
}
