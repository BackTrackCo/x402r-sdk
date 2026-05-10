import type { PaymentInfoStruct } from '@x402r/evm'
import type { PaymentInfo } from '../types/index.js'

// ---------------------------------------------------------------------------
// Companion types
// ---------------------------------------------------------------------------

export type ToPaymentInfoReturnType = PaymentInfo

/** Convert an on-chain PaymentInfoStruct (string-encoded uints) to a PaymentInfo (bigint). */
export function toPaymentInfo(
  struct: PaymentInfoStruct,
): ToPaymentInfoReturnType {
  return {
    operator: struct.operator,
    payer: struct.payer,
    receiver: struct.receiver,
    token: struct.token,
    maxAmount: BigInt(struct.maxAmount),
    preApprovalExpiry: struct.preApprovalExpiry,
    authorizationExpiry: struct.authorizationExpiry,
    refundExpiry: struct.refundExpiry,
    minFeeBps: struct.minFeeBps,
    maxFeeBps: struct.maxFeeBps,
    feeReceiver: struct.feeReceiver,
    salt: BigInt(struct.salt),
  }
}
