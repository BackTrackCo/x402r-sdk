import type { AuthCaptureExtra } from '@x402r/evm'

const DEFAULT_CAPTURE_WINDOW_SECONDS = 60 * 60 // 1 hour
const DEFAULT_REFUND_WINDOW_SECONDS = 60 * 60 * 24 * 7 // 7 days
const DEFAULT_MIN_FEE_BPS = 0
const DEFAULT_MAX_FEE_BPS = 100 // 1%
const DEFAULT_TOKEN_NAME = 'USDC'
const DEFAULT_TOKEN_VERSION = '2'

export interface X402rDefaultsInput {
  /** Address allowed to call authorize/capture/void/refund/charge on AuthCaptureEscrow. Facilitator-specific. */
  captureAuthorizer: `0x${string}`
  /** Address that receives the fee portion of every settlement. Deployment-specific. */
  feeRecipient: `0x${string}`
  /** Absolute Unix seconds; capture must occur before this. Defaults to `now + 1 hour`. */
  captureDeadline?: number
  /** Absolute Unix seconds; refunds allowed until this. Defaults to `now + 7 days`. */
  refundDeadline?: number
  /** Floor on the captureAuthorizer's fee in basis points. Defaults to `0` (no minimum). */
  minFeeBps?: number
  /** Cap on the captureAuthorizer's fee in basis points. Defaults to `100` (1%). */
  maxFeeBps?: number
  /** EIP-712 token-domain name. Defaults to `'USDC'`. */
  name?: string
  /** EIP-712 token-domain version. Defaults to `'2'`. */
  version?: string
  /** When `true`, facilitator calls `charge()` (atomic, no escrow). Omit for facilitator default (`false`). */
  autoCapture?: boolean
  /** Asset transfer method. Omit for facilitator default (`'eip3009'`). */
  assetTransferMethod?: 'eip3009' | 'permit2'
}

/**
 * Builds an `AuthCaptureExtra` with x402r's quick-start defaults.
 *
 * Required: only the deployment-specific addresses (`captureAuthorizer`,
 * `feeRecipient`). Everything else has a sensible default — deadlines
 * (`now + 1h` / `now + 7d`), fee policy (`0`–`100` bps), and EIP-712 token
 * domain (`USDC` / `2`).
 *
 * For production, override the defaults that don't match your policy.
 * Optional flags (`autoCapture`, `assetTransferMethod`) are omitted from the
 * output when undefined so the facilitator's defaults take over.
 */
export function x402rDefaults(input: X402rDefaultsInput): AuthCaptureExtra {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return {
    captureAuthorizer: input.captureAuthorizer,
    captureDeadline:
      input.captureDeadline ?? nowSeconds + DEFAULT_CAPTURE_WINDOW_SECONDS,
    refundDeadline:
      input.refundDeadline ?? nowSeconds + DEFAULT_REFUND_WINDOW_SECONDS,
    feeRecipient: input.feeRecipient,
    minFeeBps: input.minFeeBps ?? DEFAULT_MIN_FEE_BPS,
    maxFeeBps: input.maxFeeBps ?? DEFAULT_MAX_FEE_BPS,
    name: input.name ?? DEFAULT_TOKEN_NAME,
    version: input.version ?? DEFAULT_TOKEN_VERSION,
    ...(input.autoCapture !== undefined && { autoCapture: input.autoCapture }),
    ...(input.assetTransferMethod !== undefined && {
      assetTransferMethod: input.assetTransferMethod,
    }),
  }
}
