import type { AuthCaptureExtra } from '@x402r/evm'
import type { Address } from 'viem'

export interface X402rDefaultsInput {
  /** Address allowed to call authorize/capture/void/refund/charge on AuthCaptureEscrow. */
  captureAuthorizer: Address
  /** Absolute Unix seconds; capture must occur before this. */
  captureDeadline: number
  /** Absolute Unix seconds; refunds allowed until this. */
  refundDeadline: number
  /** Address that receives the fee portion of every settlement. */
  feeRecipient: Address
  /** Floor on the captureAuthorizer's fee in basis points. `0` = no minimum. */
  minFeeBps: number
  /** Cap on the captureAuthorizer's fee in basis points. */
  maxFeeBps: number
  /** EIP-712 token-domain name (e.g., `"USDC"`). */
  name: string
  /** EIP-712 token-domain version (e.g., `"2"`). */
  version: string
  /** When `true`, facilitator calls `charge()` (atomic, no escrow). Omit for facilitator default (`false`). */
  autoCapture?: boolean
  /** Asset transfer method. Omit for facilitator default (`'eip3009'`). */
  assetTransferMethod?: 'eip3009' | 'permit2'
}

/**
 * Builds an `AuthCaptureExtra` (the `extra` field of `PaymentRequirements`).
 *
 * Typed constructor for the wire-format `extra` shape from `@x402r/evm`. The
 * facilitator-provided fields (`captureAuthorizer`, `feeRecipient`, fee bps)
 * typically come from a facilitator's `/supported` endpoint and merge into
 * the merchant's requirements via `AuthCaptureServerScheme.enhancePaymentRequirements`.
 * This helper exists for merchants building requirements directly, or for
 * tests/examples that need a hand-built `extra`.
 *
 * Optional flags (`autoCapture`, `assetTransferMethod`) are omitted from the
 * output when undefined so the facilitator's defaults take over.
 */
export function x402rDefaults(input: X402rDefaultsInput): AuthCaptureExtra {
  return {
    captureAuthorizer: input.captureAuthorizer,
    captureDeadline: input.captureDeadline,
    refundDeadline: input.refundDeadline,
    feeRecipient: input.feeRecipient,
    minFeeBps: input.minFeeBps,
    maxFeeBps: input.maxFeeBps,
    name: input.name,
    version: input.version,
    ...(input.autoCapture !== undefined && { autoCapture: input.autoCapture }),
    ...(input.assetTransferMethod !== undefined && {
      assetTransferMethod: input.assetTransferMethod,
    }),
  }
}
