import type { EscrowPayload } from '@x402r/evm'
import type { Address } from 'viem'
import type { PaymentInfo } from '../types/index.js'

// ---------------------------------------------------------------------------
// Companion types
// ---------------------------------------------------------------------------

export type ToPaymentInfoReturnType = PaymentInfo

/** JSON-safe representation of PaymentInfo (bigint fields stored as strings). */
export interface SerializedPaymentInfo {
  operator: Address
  payer: Address
  receiver: Address
  token: Address
  maxAmount: string
  preApprovalExpiry: number
  authorizationExpiry: number
  refundExpiry: number
  minFeeBps: number
  maxFeeBps: number
  feeReceiver: Address
  salt: string
}

// ---------------------------------------------------------------------------
// EscrowPayload → PaymentInfo
// ---------------------------------------------------------------------------

/** Convert an EscrowPayload (from verified x402 payment) to a PaymentInfo struct. */
export function toPaymentInfo(
  escrowPayload: EscrowPayload,
): ToPaymentInfoReturnType {
  const pi = escrowPayload.paymentInfo
  return {
    operator: pi.operator,
    payer: escrowPayload.authorization.from,
    receiver: pi.receiver,
    token: pi.token,
    maxAmount: BigInt(pi.maxAmount),
    preApprovalExpiry: pi.preApprovalExpiry,
    authorizationExpiry: pi.authorizationExpiry,
    refundExpiry: pi.refundExpiry,
    minFeeBps: pi.minFeeBps,
    maxFeeBps: pi.maxFeeBps,
    feeReceiver: pi.feeReceiver,
    salt: BigInt(pi.salt),
  }
}

// ---------------------------------------------------------------------------
// PaymentInfo ↔ JSON serialization
// ---------------------------------------------------------------------------

/** Serialize PaymentInfo to a JSON-safe object (bigint → string). */
export function serializePaymentInfo(pi: PaymentInfo): SerializedPaymentInfo {
  return {
    operator: pi.operator,
    payer: pi.payer,
    receiver: pi.receiver,
    token: pi.token,
    maxAmount: pi.maxAmount.toString(),
    preApprovalExpiry: pi.preApprovalExpiry,
    authorizationExpiry: pi.authorizationExpiry,
    refundExpiry: pi.refundExpiry,
    minFeeBps: pi.minFeeBps,
    maxFeeBps: pi.maxFeeBps,
    feeReceiver: pi.feeReceiver,
    salt: pi.salt.toString(),
  }
}

/** Deserialize a JSON-safe object back to PaymentInfo (string → bigint). */
export function deserializePaymentInfo(
  raw: SerializedPaymentInfo,
): PaymentInfo {
  return {
    operator: raw.operator,
    payer: raw.payer,
    receiver: raw.receiver,
    token: raw.token,
    maxAmount: BigInt(raw.maxAmount),
    preApprovalExpiry: raw.preApprovalExpiry,
    authorizationExpiry: raw.authorizationExpiry,
    refundExpiry: raw.refundExpiry,
    minFeeBps: raw.minFeeBps,
    maxFeeBps: raw.maxFeeBps,
    feeReceiver: raw.feeReceiver,
    salt: BigInt(raw.salt),
  }
}
