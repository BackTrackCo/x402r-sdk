/**
 * PaymentInfo validation utilities
 * @module validation
 */

import type { PaymentInfo } from "../types/index.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Severity level for validation issues
 */
export type ValidationSeverity = "error" | "warning";

/**
 * A single validation issue found in PaymentInfo
 */
export interface ValidationIssue {
  /** Which field has the issue */
  field: string;
  /** Human-readable description */
  message: string;
  /** Whether this is a blocking error or advisory warning */
  severity: ValidationSeverity;
}

/**
 * Validate a PaymentInfo object for common issues before submitting transactions.
 *
 * Checks:
 * - Non-zero required address fields (operator, receiver, token, feeReceiver)
 * - maxAmount > 0
 * - Fee bounds: minFeeBps <= maxFeeBps, maxFeeBps <= 10000
 * - authorizationExpiry in the future (if > 0)
 * - preApprovalExpiry in the future (if > 0) — also used as ERC-3009 validBefore
 * - feeReceiver == operator (warning if mismatched — contract will revert)
 *
 * Note: payer can be zero address (payer-agnostic payments).
 *
 * @param paymentInfo - The PaymentInfo to validate
 * @returns Array of validation issues (empty = valid)
 *
 * @example
 * ```typescript
 * const issues = validatePaymentInfo(paymentInfo);
 * const errors = issues.filter(i => i.severity === 'error');
 * if (errors.length > 0) {
 *   throw new Error(`Invalid PaymentInfo: ${errors.map(e => e.message).join(', ')}`);
 * }
 * ```
 */
export function validatePaymentInfo(paymentInfo: PaymentInfo): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Required non-zero addresses
  if (paymentInfo.operator === ZERO_ADDRESS) {
    issues.push({
      field: "operator",
      message: "operator address must not be zero",
      severity: "error",
    });
  }

  if (paymentInfo.receiver === ZERO_ADDRESS) {
    issues.push({
      field: "receiver",
      message: "receiver address must not be zero",
      severity: "error",
    });
  }

  if (paymentInfo.token === ZERO_ADDRESS) {
    issues.push({
      field: "token",
      message: "token address must not be zero",
      severity: "error",
    });
  }

  if (paymentInfo.feeReceiver === ZERO_ADDRESS) {
    issues.push({
      field: "feeReceiver",
      message: "feeReceiver address must not be zero",
      severity: "error",
    });
  }

  // maxAmount must be positive
  if (paymentInfo.maxAmount <= 0n) {
    issues.push({
      field: "maxAmount",
      message: "maxAmount must be greater than 0",
      severity: "error",
    });
  }

  // Fee bounds
  if (paymentInfo.minFeeBps > paymentInfo.maxFeeBps) {
    issues.push({
      field: "minFeeBps",
      message: `minFeeBps (${paymentInfo.minFeeBps}) must be <= maxFeeBps (${paymentInfo.maxFeeBps})`,
      severity: "error",
    });
  }

  if (paymentInfo.maxFeeBps > 10000) {
    issues.push({
      field: "maxFeeBps",
      message: `maxFeeBps (${paymentInfo.maxFeeBps}) must be <= 10000 (100%)`,
      severity: "error",
    });
  }

  // Expiry checks (only if non-zero — 0 means "not used" for some fields)
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));

  if (paymentInfo.authorizationExpiry > 0n && paymentInfo.authorizationExpiry <= nowSeconds) {
    issues.push({
      field: "authorizationExpiry",
      message: "authorizationExpiry is in the past",
      severity: "error",
    });
  }

  if (paymentInfo.preApprovalExpiry > 0n && paymentInfo.preApprovalExpiry <= nowSeconds) {
    issues.push({
      field: "preApprovalExpiry",
      message:
        "preApprovalExpiry is in the past. Note: this field doubles as ERC-3009 validBefore — " +
        "an expired value will cause the authorization signature to be rejected",
      severity: "error",
    });
  }

  // feeReceiver should match operator (contract enforces this)
  if (
    paymentInfo.operator !== ZERO_ADDRESS &&
    paymentInfo.feeReceiver !== ZERO_ADDRESS &&
    paymentInfo.feeReceiver !== paymentInfo.operator
  ) {
    issues.push({
      field: "feeReceiver",
      message:
        `feeReceiver (${paymentInfo.feeReceiver}) does not match operator (${paymentInfo.operator}). ` +
        "The contract requires feeReceiver == operator address — this will revert with InvalidFeeReceiver()",
      severity: "warning",
    });
  }

  return issues;
}
