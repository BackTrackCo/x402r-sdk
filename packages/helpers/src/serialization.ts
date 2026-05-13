import { ValidationError } from '@x402r/core/errors'
import type { PaymentInfo } from '@x402r/core/types'
import type { PaymentInfoStruct } from '@x402r/evm'
import { hexToBigInt } from 'viem'

// ---------------------------------------------------------------------------
// Companion types
// ---------------------------------------------------------------------------

export type ToPaymentInfoReturnType = PaymentInfo

/** Convert an on-chain PaymentInfoStruct (string-encoded uints) to a PaymentInfo (bigint). */
export function toPaymentInfo(
  struct: PaymentInfoStruct,
): ToPaymentInfoReturnType {
  let maxAmount: bigint
  try {
    maxAmount = BigInt(struct.maxAmount)
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ValidationError(
        `toPaymentInfo: invalid maxAmount '${struct.maxAmount}' — expected decimal-string uint256`,
        { cause: err },
      )
    }
    throw err
  }

  let salt: bigint
  try {
    salt = hexToBigInt(struct.salt)
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ValidationError(
        `toPaymentInfo: invalid salt '${struct.salt}' (expected 0x-prefixed bytes32 hex)`,
        { cause: err },
      )
    }
    throw err
  }

  return {
    operator: struct.operator,
    payer: struct.payer,
    receiver: struct.receiver,
    token: struct.token,
    maxAmount,
    preApprovalExpiry: struct.preApprovalExpiry,
    authorizationExpiry: struct.authorizationExpiry,
    refundExpiry: struct.refundExpiry,
    minFeeBps: struct.minFeeBps,
    maxFeeBps: struct.maxFeeBps,
    feeReceiver: struct.feeReceiver,
    salt,
  }
}
