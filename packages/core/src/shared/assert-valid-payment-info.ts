/**
 * Shared PaymentInfo assertion utility
 * @module shared/assert-valid-payment-info
 */

import { X402rError } from "../errors/index.js";
import type { PaymentInfo } from "../types/index.js";
import { validatePaymentInfo } from "../validation/index.js";

/**
 * Asserts that a PaymentInfo object is valid for contract submission.
 * Only error-severity issues cause a throw; warnings pass through.
 *
 * @param paymentInfo - The PaymentInfo to validate
 * @throws {X402rError} with "InvalidPaymentInfo" code if validation errors exist
 */
export function assertValidPaymentInfo(paymentInfo: PaymentInfo): void {
  const issues = validatePaymentInfo(paymentInfo);
  const errors = issues.filter(i => i.severity === "error");
  if (errors.length > 0) {
    const summary = errors.map(e => `${e.field}: ${e.message}`).join("; ");
    throw new X402rError("InvalidPaymentInfo", `Invalid PaymentInfo: ${summary}`, {
      issues: errors,
    });
  }
}
