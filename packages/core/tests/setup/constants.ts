// ---------------------------------------------------------------------------
// Shared anvil/test fixtures live in @x402r/test-fixtures. Re-exported here so
// the existing test imports (and the DEFAULT_AMOUNT alias) stay stable.
// ---------------------------------------------------------------------------

export {
  accounts,
  ESCROW_FAST_FORWARD,
  FAR_FUTURE,
  type TestAccount,
  testRoles,
} from '@x402r/test-fixtures'

import { DEFAULT_PAYMENT_AMOUNT } from '@x402r/test-fixtures'

/** 1 USDC (6 decimals) — default amount for test scenarios. */
export const DEFAULT_AMOUNT = DEFAULT_PAYMENT_AMOUNT

// ---------------------------------------------------------------------------
// Pool ID for parallel test isolation (vitest-specific, stays local)
// ---------------------------------------------------------------------------

export const poolId =
  Number(process.env.VITEST_POOL_ID ?? 1) *
  Number(process.env.VITEST_SHARD_ID ?? 1)
