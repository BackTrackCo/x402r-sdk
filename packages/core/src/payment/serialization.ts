import type { EscrowPayload } from '@x402r/evm'
import type { PaymentInfo } from '../types/index.js'

// ---------------------------------------------------------------------------
// Companion types
// ---------------------------------------------------------------------------

export type ToPaymentInfoReturnType = PaymentInfo

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
