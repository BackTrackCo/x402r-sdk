/**
 * Shared utilities for CLI examples
 */

import type { PaymentInfo, Evidence } from "@x402r/core";
import { SubmitterRole } from "@x402r/core";

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
    console.error("Error: Invalid payment JSON");
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
  return `${whole}.${fractional.toString().padStart(decimals, "0")} USDC`;
}

/**
 * Map SubmitterRole enum to a human-readable string
 */
function roleName(role: SubmitterRole): string {
  switch (role) {
    case SubmitterRole.Payer:
      return "Payer";
    case SubmitterRole.Receiver:
      return "Receiver";
    case SubmitterRole.Arbiter:
      return "Arbiter";
    default:
      return `Unknown(${role})`;
  }
}

/**
 * Format a single evidence entry for CLI display
 */
export function formatEvidence(evidence: Evidence, index?: number): string {
  const prefix = index !== undefined ? `[${index}] ` : "";
  const ts = new Date(Number(evidence.timestamp) * 1000).toISOString();
  return `${prefix}${roleName(evidence.role)} ${shortAddress(evidence.submitter)} | ${ts} | CID: ${evidence.cid}`;
}

/**
 * Format a list of evidence entries as a tabular display
 */
export function formatEvidenceList(entries: Evidence[]): string {
  if (entries.length === 0) {
    return "  No evidence submitted";
  }
  return entries.map((e, i) => `  ${formatEvidence(e, i)}`).join("\n");
}
