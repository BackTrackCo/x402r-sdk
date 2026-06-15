import type { Address } from 'viem'
import { encodeAbiParameters, keccak256 } from 'viem'

// ---------------------------------------------------------------------------
// Fork-test helpers shared by the runnable scenarios.
//
// Deterministic Anvil accounts + the USDC balance-slot machinery used to fund
// the payer via storage-slot manipulation. Kept minimal: the per-action SDK
// examples that needed a deployed MarketplaceOperator moved into the core
// fork-test suite (packages/core/tests/integration/*.fork.test.ts), so the
// only surviving consumer is scenarios/http-wire-capture.ts.
// ---------------------------------------------------------------------------

/** Anvil test accounts (deterministic mnemonic). */
export const testAccounts = {
  deployer: {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address,
    privateKey:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const,
  },
  payer: {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
    privateKey:
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const,
  },
  receiver: {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
    privateKey:
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const,
  },
  feeReceiver: {
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as Address,
    privateKey:
      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as const,
  },
  arbiter: {
    address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65' as Address,
    privateKey:
      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' as const,
  },
} as const

/** Base Sepolia USDC (FiatTokenV2_2) balance-mapping base slot. */
export const USDC_BALANCE_SLOT = 9n

/** Compute the storage slot for `balanceOf[account]` in a Solidity mapping. */
export function getBalanceSlot(
  account: Address,
  baseSlot: bigint,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [account, baseSlot],
    ),
  )
}
