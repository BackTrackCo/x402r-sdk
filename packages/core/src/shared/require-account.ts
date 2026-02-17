/**
 * Shared account assertion utility
 * @module shared/require-account
 */

import type { WalletClient } from "viem";

/**
 * Asserts that a WalletClient has an account attached.
 * Throws a descriptive error if the account is missing, which can happen when
 * a WalletClient is created without passing an account (e.g., for browser wallet integration).
 */
export function requireAccount(walletClient: WalletClient): asserts walletClient is WalletClient & {
  account: NonNullable<WalletClient["account"]>;
} {
  if (!walletClient.account) {
    throw new Error(
      "WalletClient must have an account. Pass an account when creating the WalletClient: " +
        "createWalletClient({ account, chain, transport })",
    );
  }
}
