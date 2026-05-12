import type { AuthCaptureExtra } from '@x402r/evm'

const DEFAULT_CAPTURE_WINDOW_SECONDS = 60 * 60 * 24 // 24 hours
const DEFAULT_REFUND_WINDOW_SECONDS = 60 * 60 * 24 * 7 // 7 days
const DEFAULT_MIN_FEE_BPS = 0
const DEFAULT_MAX_FEE_BPS = 100 // 1%
const DEFAULT_TOKEN_NAME = 'USDC'
const DEFAULT_TOKEN_VERSION = '2'

// Address fields below use the template-literal type `0x${string}` (the
// exact shape used by AuthCaptureExtra in @x402r/evm@0.2.0-alpha.0).
// Mirrors upstream rather than importing viem's branded Address, which
// would pull viem into @x402r/helpers' dep surface for marginal value.
export interface X402rDefaultsInput {
  /** Address allowed to call authorize/capture/void/refund/charge on AuthCaptureEscrow. Facilitator-specific. */
  captureAuthorizer: `0x${string}`
  /**
   * Address that receives the fee portion of every settlement.
   *
   * Defaults to `captureAuthorizer` — the x402r deployment convention is that
   * operator-and-fee-recipient are the same EOA. Override only if your
   * facilitator routes fees to a separate treasury.
   */
  feeRecipient?: `0x${string}`
  /**
   * Absolute Unix seconds; capture must occur before this. Defaults to
   * `now + 24 hours`.
   *
   * Quick-start default favors async capture pipelines (worker queues,
   * manual review, batched capture). Tighten the override for atomic flows
   * where capture happens immediately after authorize.
   */
  captureDeadline?: number
  /** Absolute Unix seconds; refunds allowed until this. Defaults to `now + 7 days`. */
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
 * Builds an `AuthCaptureExtra` with x402r's quick-start defaults.
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
 * (`now + 24h` / `now + 7d`), fee policy (`0`–`100` bps), and EIP-712 token
 * domain (`USDC` / `2`).
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
export function x402rDefaults(input: X402rDefaultsInput): AuthCaptureExtra {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return {
    captureAuthorizer: input.captureAuthorizer,
    captureDeadline:
      input.captureDeadline ?? nowSeconds + DEFAULT_CAPTURE_WINDOW_SECONDS,
    refundDeadline:
      input.refundDeadline ?? nowSeconds + DEFAULT_REFUND_WINDOW_SECONDS,
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
