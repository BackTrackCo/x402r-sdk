import { ValidationError } from '@x402r/core/errors'
import type { AuthCaptureExtra } from '@x402r/evm'

const DEFAULT_CAPTURE_WINDOW_SECONDS = 60 * 60 * 24 // 24 hours
const DEFAULT_REFUND_WINDOW_SECONDS = 60 * 60 * 24 * 7 // 7 days
const DEFAULT_MIN_FEE_BPS = 0
const DEFAULT_MAX_FEE_BPS = 100 // 1%
const DEFAULT_TOKEN_NAME = 'USDC'
const DEFAULT_TOKEN_VERSION = '2'

/**
 * The deadline fields `x402rDefaults` may emit. Capture and refund are resolved
 * independently: each is either its absolute Unix-seconds deadline (opt-in) or
 * its relative offset (`*Seconds`, the default). The two windows can use
 * different shapes — e.g. an absolute `captureDeadline` alongside a relative
 * `refundDeadlineSeconds`.
 *
 * `@x402r/evm`'s `AuthCaptureExtra` types only the absolute `captureDeadline` /
 * `refundDeadline` and has no `*Seconds` fields, because those are a
 * merchant-input convenience the server scheme resolves away per request (it
 * reads `extra.captureDeadlineSeconds` / `refundDeadlineSeconds` and converts
 * them to absolute deadlines before the wire payload is built). We model the
 * relative variant here, in helpers, rather than widening the wire type.
 */
type DeadlineExtra = (
  | { captureDeadline: number }
  | { captureDeadlineSeconds: number }
) &
  ({ refundDeadline: number } | { refundDeadlineSeconds: number })

/**
 * Return shape of {@link x402rDefaults}: every non-deadline `AuthCaptureExtra`
 * field, plus a per-field deadline product — each of capture / refund is either
 * its absolute deadline or its relative `*Seconds` offset.
 */
export type X402rDefaultsExtra = Omit<
  AuthCaptureExtra,
  'captureDeadline' | 'refundDeadline'
> &
  DeadlineExtra

// Address fields below use the template-literal type `0x${string}` (the
// exact shape used by AuthCaptureExtra in @x402r/evm@0.2.0-alpha.0).
// Mirrors upstream rather than importing viem's branded Address, which
// would pull viem into @x402r/helpers' dep surface for marginal value.
export interface X402rDefaultsInput {
  /**
   * Address allowed to call authorize/capture/void/refund/charge on
   * AuthCaptureEscrow. Facilitator-specific. Becomes the on-chain
   * `PaymentInfo.operator`; it may be a facilitator EOA or a deployed
   * `PaymentOperator` contract — not necessarily this SDK's deployed
   * `operatorAddress`.
   */
  captureAuthorizer: `0x${string}`
  /**
   * Address that receives the fee portion of every settlement. Defaults to
   * `captureAuthorizer` (the x402r deployment convention: operator and fee
   * recipient are the same EOA).
   *
   * WARNING: misrouting fees is silent — there's no on-chain revert if this
   * address is wrong; fees flow to whatever you set and the divergence is
   * discovered at accounting time. Override only when your facilitator routes
   * fees to a separate treasury, and verify the address matches your
   * facilitator's published `feeReceiver` before going to production.
   */
  feeRecipient?: `0x${string}`
  /**
   * Relative capture window in seconds. The server scheme resolves this to an
   * absolute deadline per request, so every authorization gets a fresh window.
   * Defaults to `86400` (24 hours).
   *
   * Quick-start default favors async capture pipelines (worker queues,
   * manual review, batched capture). Tighten the override for atomic flows
   * where capture happens immediately after authorize.
   */
  captureDeadlineSeconds?: number
  /**
   * Relative refund window in seconds, resolved to an absolute deadline per
   * request by the server scheme. Defaults to `604800` (7 days).
   */
  refundDeadlineSeconds?: number
  /**
   * Absolute Unix seconds; capture must occur before this. Opt-in escape
   * hatch for a fixed wall-clock deadline; prefer `captureDeadlineSeconds`,
   * which the server scheme refreshes per request. Resolved independently of
   * the refund window — set this to fix the capture deadline while leaving the
   * refund window relative (or vice versa).
   */
  captureDeadline?: number
  /**
   * Absolute Unix seconds; refunds allowed until this. Opt-in escape hatch —
   * see `captureDeadline`. Prefer `refundDeadlineSeconds`. Resolved
   * independently of the capture window.
   */
  refundDeadline?: number
  /** Floor on the captureAuthorizer's fee in basis points. Defaults to `0` (no minimum). */
  minFeeBps?: number
  /**
   * Cap on the captureAuthorizer's fee in basis points. Defaults to `100` (1%).
   *
   * WARNING: this caps the facilitator's allowed fee. If your facilitator's
   * on-chain `protocolFeeConfig` charges more than this, every payment will
   * revert on-chain. Override to match your facilitator's published fee
   * policy in production.
   */
  maxFeeBps?: number
  /**
   * EIP-712 token-domain name. Defaults to `'USDC'`.
   *
   * Must match the token contract's EIP-712 domain `name()` exactly.
   * Defaults assume USDC; override for any other token (EURC, PYUSD, DAI,
   * etc.) or signatures will fail verification on-chain.
   */
  name?: string
  /**
   * EIP-712 token-domain version. Defaults to `'2'`.
   *
   * Must match the token contract's EIP-712 domain `version()` exactly. See
   * the `name` field warning — same domain-mismatch class of bug.
   */
  version?: string
  /** When `true`, facilitator calls `charge()` (atomic, no escrow). Omit for facilitator default (`false`). */
  autoCapture?: boolean
  /** Asset transfer method. Omit for facilitator default (`'eip3009'`). */
  assetTransferMethod?: 'eip3009' | 'permit2'
}

/**
 * Builds an auth-capture `extra` with x402r's quick-start defaults.
 *
 * **Audience.** Merchants building `PaymentRequirements` directly
 * (single-tenant facilitator, merchant-as-facilitator atomic-charge pattern)
 * and tests/examples needing a hand-built `extra`. Multi-facilitator
 * production merchants typically don't construct `extra` themselves — they
 * accept the facilitator's `/supported` advertisement merged into their
 * requirements via `AuthCaptureServerScheme.enhancePaymentRequirements`
 * (`@x402r/evm`).
 *
 * **Required:** only the facilitator-specific `captureAuthorizer`. Everything
 * else has a sensible default — `feeRecipient` (defaults to the
 * `captureAuthorizer`, per the x402r deployment convention), deadlines
 * (relative `24h` / `7d` windows, see below), fee policy (`0`–`100` bps), and
 * EIP-712 token domain (`USDC` / `2`).
 *
 * **Deadlines are relative by default.** The output carries
 * `captureDeadlineSeconds` / `refundDeadlineSeconds` (`86400` / `604800`),
 * which the auth-capture server scheme resolves to absolute deadlines *per
 * request* — so every authorization gets a fresh window. Capture and refund
 * resolve independently: pass an absolute `captureDeadline` and/or
 * `refundDeadline` to fix either window to a wall-clock deadline while leaving
 * the other relative. The helper never reads the wall clock, so its output is
 * deterministic.
 *
 * **Wire-spec note.** `@x402r/evm`'s `AuthCaptureExtra` source comment
 * explicitly demands no implicit defaults on the fee fields, to force
 * conscious fee policy on every wire payload. This helper deliberately
 * provides defaults at the SDK layer for quick-start ergonomics. Production
 * callers should override fee bps to match their facilitator's published
 * policy, deadlines to match their settlement cadence, and token domain to
 * match their actual ERC-20.
 *
 * Optional flags (`autoCapture`, `assetTransferMethod`) are omitted from the
 * output when undefined so the facilitator's wire-spec defaults take over.
 */
export function x402rDefaults(input: X402rDefaultsInput): X402rDefaultsExtra {
  // Resolve capture and refund independently. Each field emits its absolute
  // value when the caller passed it, else its relative offset — which the
  // server scheme refreshes per request, avoiding the wall-clock-frozen-at-boot
  // footgun the absolute defaults used to cause.
  const capture =
    input.captureDeadline !== undefined
      ? { captureDeadline: input.captureDeadline }
      : {
          captureDeadlineSeconds:
            input.captureDeadlineSeconds ?? DEFAULT_CAPTURE_WINDOW_SECONDS,
        }
  const refund =
    input.refundDeadline !== undefined
      ? { refundDeadline: input.refundDeadline }
      : {
          refundDeadlineSeconds:
            input.refundDeadlineSeconds ?? DEFAULT_REFUND_WINDOW_SECONDS,
        }

  // Guard ordering only when it's comparable without reading the clock: both
  // absolute, or both relative. The refund window must not end before the
  // capture deadline. For the mixed case (one absolute + one relative) we skip
  // validation — the facilitator validates ordering after the server resolves
  // offsets, and the helper deliberately avoids reading the wall clock, so it
  // can't compare mixed shapes.
  if (
    input.captureDeadline !== undefined &&
    input.refundDeadline !== undefined &&
    input.refundDeadline < input.captureDeadline
  ) {
    throw new ValidationError(
      `refundDeadline (${input.refundDeadline}) must not be earlier than captureDeadline (${input.captureDeadline}): the refund window cannot end before the capture deadline`,
    )
  }
  if (
    'captureDeadlineSeconds' in capture &&
    'refundDeadlineSeconds' in refund &&
    capture.captureDeadlineSeconds !== undefined &&
    refund.refundDeadlineSeconds !== undefined &&
    refund.refundDeadlineSeconds < capture.captureDeadlineSeconds
  ) {
    throw new ValidationError(
      `refundDeadlineSeconds (${refund.refundDeadlineSeconds}) must not be less than captureDeadlineSeconds (${capture.captureDeadlineSeconds}): the refund window cannot end before the capture deadline`,
    )
  }

  const deadlines: DeadlineExtra = { ...capture, ...refund }
  return {
    captureAuthorizer: input.captureAuthorizer,
    ...deadlines,
    feeRecipient: input.feeRecipient ?? input.captureAuthorizer,
    minFeeBps: input.minFeeBps ?? DEFAULT_MIN_FEE_BPS,
    maxFeeBps: input.maxFeeBps ?? DEFAULT_MAX_FEE_BPS,
    name: input.name ?? DEFAULT_TOKEN_NAME,
    version: input.version ?? DEFAULT_TOKEN_VERSION,
    // Conditional spread preserves the omit-from-wire signal — explicit
    // undefined ≠ field-not-set on the wire, which is what lets the
    // facilitator's documented default win.
    ...(input.autoCapture !== undefined && { autoCapture: input.autoCapture }),
    ...(input.assetTransferMethod !== undefined && {
      assetTransferMethod: input.assetTransferMethod,
    }),
  }
}
