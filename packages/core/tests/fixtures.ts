import type { Address, Chain, PublicClient, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import type { PaymentInfo } from '../src/types/index.js'

export { zeroAddress }

// ---------------------------------------------------------------------------
// Mock clients for unit tests
// ---------------------------------------------------------------------------

export function createMockPublicClient(
  responses: Record<string, unknown> = {},
): PublicClient {
  return {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName in responses) return responses[functionName]
      throw new Error(`No mock response for readContract(${functionName})`)
    },
  } as unknown as PublicClient
}

export function createMockWalletClient(
  options: {
    writeContract?: (args: unknown) => Promise<`0x${string}`>
    chain?: Chain
    account?: Address
  } = {},
): WalletClient {
  return {
    writeContract:
      options.writeContract ??
      (async () => `0x${'0'.repeat(64)}` as `0x${string}`),
    chain: options.chain ?? { id: 84532, name: 'Base Sepolia' },
    account: options.account ?? '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  } as unknown as WalletClient
}

export const TEST_CHAIN_ID = 84532
export const TEST_ESCROW_ADDRESS =
  '0xb9488351E48b23D798f24e8174514F28B741Eb4f' as const

export const FUTURE_TIMESTAMP = 2_000_000_000 // 2033-05-18
export const PAST_TIMESTAMP = 1_000_000_000 // 2001-09-09

export const TEST_ADDRESSES = {
  operator: '0x1234567890123456789012345678901234567890',
  payer: '0x2345678901234567890123456789012345678901',
  receiver: '0x3456789012345678901234567890123456789012',
  token: '0x4567890123456789012345678901234567890123',
  feeReceiver: '0x5678901234567890123456789012345678901234',
} as const

export function makePaymentInfo(
  overrides: Partial<PaymentInfo> = {},
): PaymentInfo {
  return {
    operator: TEST_ADDRESSES.operator,
    payer: TEST_ADDRESSES.payer,
    receiver: TEST_ADDRESSES.receiver,
    token: TEST_ADDRESSES.token,
    maxAmount: 1000000n,
    preApprovalExpiry: 0,
    authorizationExpiry: 1735689600,
    refundExpiry: 1738368000,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: TEST_ADDRESSES.feeReceiver,
    salt: 0x123456789abcdefn,
    ...overrides,
  }
}
