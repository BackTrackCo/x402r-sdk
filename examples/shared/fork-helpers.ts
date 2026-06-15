import { testRoles } from '@x402r/test-fixtures'

// ---------------------------------------------------------------------------
// Fork-test helpers shared by the runnable scenarios.
//
// Stateless anvil/USDC machinery now lives in @x402r/test-fixtures and is
// re-exported here so scenarios/http-wire-capture.ts keeps its existing import
// surface. testAccounts is the named subset that scenario derives from the
// shared testRoles map.
// ---------------------------------------------------------------------------

export { getBalanceSlot, USDC_BALANCE_SLOT } from '@x402r/test-fixtures'

/** Named Anvil test accounts used by the runnable scenarios. */
export const testAccounts = {
  deployer: testRoles.deployer,
  payer: testRoles.payer,
  receiver: testRoles.receiver,
} as const
