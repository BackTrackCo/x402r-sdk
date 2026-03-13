import type { Address, Hex } from 'viem'

// ---------------------------------------------------------------------------
// Anvil / Hardhat default accounts (deterministic mnemonic)
// "test test test test test test test test test test test junk"
// ---------------------------------------------------------------------------

export interface TestAccount {
  address: Address
  privateKey: Hex
}

export const accounts: readonly TestAccount[] = [
  {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey:
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey:
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  },
  {
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    privateKey:
      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  },
  {
    address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    privateKey:
      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  },
  {
    address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    privateKey:
      '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  },
  {
    address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    privateKey:
      '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  },
  {
    address: '0x14dC79964da2C08dA15Fd353d30d9CBa19a4d8c6',
    privateKey:
      '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  },
  {
    address: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    privateKey:
      '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  },
  {
    address: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    privateKey:
      '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
  },
] as const

// ---------------------------------------------------------------------------
// Pool ID for parallel test isolation
// ---------------------------------------------------------------------------

export const poolId =
  Number(process.env.VITEST_POOL_ID ?? 1) *
  Number(process.env.VITEST_SHARD_ID ?? 1)

// ---------------------------------------------------------------------------
// Named test roles
// ---------------------------------------------------------------------------

export const testRoles = {
  deployer: accounts[0],
  payer: accounts[1],
  receiver: accounts[2],
  operatorFeeRecipient: accounts[3],
  arbiter: accounts[4],
  relayer: accounts[5],
} as const

// ---------------------------------------------------------------------------
// Shared test constants
// ---------------------------------------------------------------------------

/** Max uint48 — effectively "never expires" for test paymentInfo */
export const FAR_FUTURE = 281474976710655

/** 1 USDC (6 decimals) — default amount for test scenarios */
export const DEFAULT_AMOUNT = 1_000_000n

/** 7 days + 1 second — fast-forward past the default escrow period */
export const ESCROW_FAST_FORWARD = 604801
