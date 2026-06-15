// ---------------------------------------------------------------------------
// Shared test constants for anvil fork harnesses (vitest + standalone tsx).
// ---------------------------------------------------------------------------

/** USDC (proxy) balanceOf mapping base storage slot on Base Sepolia. */
export const USDC_BALANCE_SLOT = 9n

/** Max uint48 — effectively "never expires" for test paymentInfo. */
export const FAR_FUTURE = 281474976710655

/** 7 days + 1 second — fast-forward past the default escrow period. */
export const ESCROW_FAST_FORWARD = 604801

/** 1 USDC (6 decimals) — default amount for test scenarios. */
export const DEFAULT_PAYMENT_AMOUNT = 1_000_000n

/** 10,000 USDC (6 decimals) — payer funding amount via storage manipulation. */
export const PAYER_USDC_FUNDING_AMOUNT = 10_000_000_000n
