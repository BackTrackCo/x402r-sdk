import { zeroAddress } from 'viem'
import type { PaymentInfo } from '../types/index.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  field: string
  message: string
  severity: ValidationSeverity
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validatePaymentInfo(
  paymentInfo: PaymentInfo,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Required non-zero addresses (payer can be zero — payer-agnostic payments)
  if (paymentInfo.operator === zeroAddress) {
    issues.push({
      field: 'operator',
      message: 'operator address must not be zero',
      severity: 'error',
    })
  }

  if (paymentInfo.receiver === zeroAddress) {
    issues.push({
      field: 'receiver',
      message: 'receiver address must not be zero',
      severity: 'error',
    })
  }

  if (paymentInfo.token === zeroAddress) {
    issues.push({
      field: 'token',
      message: 'token address must not be zero',
      severity: 'error',
    })
  }

  if (paymentInfo.feeReceiver === zeroAddress) {
    issues.push({
      field: 'feeReceiver',
      message: 'feeReceiver address must not be zero',
      severity: 'error',
    })
  }

  if (paymentInfo.maxAmount <= 0n) {
    issues.push({
      field: 'maxAmount',
      message: 'maxAmount must be greater than 0',
      severity: 'error',
    })
  }

  // Fee bounds
  if (paymentInfo.minFeeBps > paymentInfo.maxFeeBps) {
    issues.push({
      field: 'minFeeBps',
      message: `minFeeBps (${paymentInfo.minFeeBps}) must be <= maxFeeBps (${paymentInfo.maxFeeBps})`,
      severity: 'error',
    })
  }

  if (paymentInfo.maxFeeBps > 10000) {
    issues.push({
      field: 'maxFeeBps',
      message: `maxFeeBps (${paymentInfo.maxFeeBps}) must be <= 10000 (100%)`,
      severity: 'error',
    })
  }

  // Expiry checks (0 means "not used")
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (
    paymentInfo.authorizationExpiry > 0 &&
    paymentInfo.authorizationExpiry <= nowSeconds
  ) {
    issues.push({
      field: 'authorizationExpiry',
      message: 'authorizationExpiry is in the past',
      severity: 'error',
    })
  }

  if (
    paymentInfo.preApprovalExpiry > 0 &&
    paymentInfo.preApprovalExpiry <= nowSeconds
  ) {
    issues.push({
      field: 'preApprovalExpiry',
      message:
        'preApprovalExpiry is in the past. Note: this field doubles as ERC-3009 validBefore — ' +
        'an expired value will cause the authorization signature to be rejected',
      severity: 'error',
    })
  }

  if (paymentInfo.refundExpiry > 0 && paymentInfo.refundExpiry <= nowSeconds) {
    issues.push({
      field: 'refundExpiry',
      message: 'refundExpiry is in the past — refund window has already closed',
      severity: 'warning',
    })
  }

  // refundExpiry should be after authorizationExpiry to allow escrow settlement
  if (
    paymentInfo.refundExpiry > 0 &&
    paymentInfo.authorizationExpiry > 0 &&
    paymentInfo.refundExpiry <= paymentInfo.authorizationExpiry
  ) {
    issues.push({
      field: 'refundExpiry',
      message: `refundExpiry (${paymentInfo.refundExpiry}) should be after authorizationExpiry (${paymentInfo.authorizationExpiry})`,
      severity: 'warning',
    })
  }

  // feeReceiver should match operator (contract enforces this)
  if (
    paymentInfo.operator !== zeroAddress &&
    paymentInfo.feeReceiver !== zeroAddress &&
    paymentInfo.feeReceiver !== paymentInfo.operator
  ) {
    issues.push({
      field: 'feeReceiver',
      message:
        `feeReceiver (${paymentInfo.feeReceiver}) does not match operator (${paymentInfo.operator}). ` +
        'The contract requires feeReceiver == operator address — this will revert with InvalidFeeReceiver()',
      severity: 'warning',
    })
  }

  return issues
}
