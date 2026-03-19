/** 1 USDC (6 decimals) — default amount for examples */
export const PAYMENT_AMOUNT = 1_000_000n

/** Anvil test account #1 (payer) private key */
export const PAYER_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const

/** Base Sepolia block explorer */
export const SCANNER = 'https://sepolia.basescan.org'

/** 7 days + 1 second — fast-forward past the default escrow period */
export const ESCROW_FAST_FORWARD = 604_801

/** Max uint48 — effectively "never expires" */
export const FAR_FUTURE = 281_474_976_710_655
