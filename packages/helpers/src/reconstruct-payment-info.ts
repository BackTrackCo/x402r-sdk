import type { SettleResultContext } from '@x402/core/server'
import { ValidationError } from '@x402r/core/errors'
import type { PaymentInfoWire } from '@x402r/core/types'
import {
  isAuthCaptureExtra,
  isAuthCapturePayload,
  isPermit2Payload,
} from '@x402r/evm'

export type ReconstructPaymentInfoWireReturnType = PaymentInfoWire

/**
 * Rebuild the JSON-form `PaymentInfoWire` from a verified `SettleResultContext`.
 *
 * Bridges the wire format (which omits the struct for compression) to the
 * JSON-safe shape that can be persisted, sent to an arbiter, or fed into
 * `PaymentInfo.fromWire()` for SDK actions.
 *
 * Handles internally:
 * - The 6 wire→struct field renames (`captureAuthorizer→operator`,
 *   `payTo→receiver`, `asset→token`, `captureDeadline→authorizationExpiry`,
 *   `refundDeadline→refundExpiry`, `feeRecipient→feeReceiver`)
 * - The EIP-3009 vs Permit2 branch for `preApprovalExpiry`
 *   (`authorization.validBefore` vs `permit2Authorization.deadline`)
 *
 * Throws `ValidationError` when:
 * - `context.requirements.extra` isn't a valid `AuthCaptureExtra`
 *   (typically because the hook fired on a non-authCapture scheme)
 * - `context.paymentPayload.payload` isn't a valid `AuthCapturePayload`
 * - `context.result.payer` is missing
 */
export function reconstructPaymentInfoWire(
  context: SettleResultContext,
): ReconstructPaymentInfoWireReturnType {
  const extra = context.requirements.extra
  if (!isAuthCaptureExtra(extra)) {
    throw new ValidationError(
      `reconstructPaymentInfoWire: requirements.extra is not a valid AuthCaptureExtra`,
    )
  }

  const payload = context.paymentPayload.payload
  if (!isAuthCapturePayload(payload)) {
    throw new ValidationError(
      `reconstructPaymentInfoWire: paymentPayload.payload is not a valid AuthCapturePayload (expected EIP-3009 or Permit2 shape)`,
    )
  }

  const payer = context.result.payer
  if (!payer) {
    throw new ValidationError(
      `reconstructPaymentInfoWire: settle result is missing payer`,
    )
  }

  const preApprovalExpiry = isPermit2Payload(payload)
    ? Number(payload.permit2Authorization.deadline)
    : Number(payload.authorization.validBefore)

  return {
    operator: extra.captureAuthorizer,
    payer: payer as `0x${string}`,
    receiver: context.requirements.payTo as `0x${string}`,
    token: context.requirements.asset as `0x${string}`,
    maxAmount: context.requirements.amount,
    preApprovalExpiry,
    authorizationExpiry: extra.captureDeadline,
    refundExpiry: extra.refundDeadline,
    minFeeBps: extra.minFeeBps,
    maxFeeBps: extra.maxFeeBps,
    feeReceiver: extra.feeRecipient,
    salt: payload.salt,
  }
}
