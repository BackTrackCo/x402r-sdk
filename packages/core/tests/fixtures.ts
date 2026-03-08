import type { Address, Chain, PublicClient, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import { vi } from 'vitest'
import type { PaymentInfo } from '../src/types/index.js'

export { zeroAddress }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MOCK_TX_HASH =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const

export const TEST_CHAIN_ID = 84532
export const TEST_ESCROW_ADDRESS =
  '0xe050bB89eD43BB02d71343063824614A7fb80B77' as const

export const FUTURE_TIMESTAMP = 2_000_000_000 // 2033-05-18
export const PAST_TIMESTAMP = 1_000_000_000 // 2001-09-09

export const TEST_ADDRESSES = {
  operator: '0x1234567890123456789012345678901234567890',
  payer: '0x2345678901234567890123456789012345678901',
  receiver: '0x3456789012345678901234567890123456789012',
  token: '0x4567890123456789012345678901234567890123',
  feeReceiver: '0x5678901234567890123456789012345678901234',
} as const

// ---------------------------------------------------------------------------
// Mock clients for unit tests
// ---------------------------------------------------------------------------

/**
 * Creates a mock public client whose `readContract` resolves from a response map.
 * Supports both `functionName` and `${address}:${functionName}` composite keys.
 */
export function createMockPublicClient(
  responses: Record<string, unknown> = {},
): PublicClient {
  return {
    readContract: vi.fn(
      ({
        address,
        functionName,
      }: {
        address?: string
        functionName: string
      }) => {
        const compositeKey = address
          ? `${address}:${functionName}`
          : functionName
        if (compositeKey in responses)
          return Promise.resolve(responses[compositeKey])
        if (functionName in responses)
          return Promise.resolve(responses[functionName])
        return Promise.reject(
          new Error(`No mock response for readContract(${compositeKey})`),
        )
      },
    ),
    multicall: vi.fn(
      ({ contracts }: { contracts: { functionName: string }[] }) => {
        const results = contracts.map(({ functionName }) => {
          if (functionName in responses) return responses[functionName]
          throw new Error(`No mock response for multicall(${functionName})`)
        })
        return Promise.resolve(results)
      },
    ),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
  } as unknown as PublicClient
}

export function createMockWalletClient(
  options: {
    writeContract?: (...args: unknown[]) => Promise<`0x${string}`>
    chain?: Chain
    account?: Address
  } = {},
): WalletClient {
  return {
    writeContract:
      options.writeContract ?? vi.fn().mockResolvedValue(MOCK_TX_HASH),
    chain: options.chain ?? { id: 84532, name: 'Base Sepolia' },
    account: options.account
      ? { address: options.account }
      : { address: TEST_ADDRESSES.payer },
  } as unknown as WalletClient
}

export function createMockWalletWithoutAccount(): WalletClient {
  return {
    writeContract: vi.fn(),
    chain: { id: 84532 },
    account: undefined,
  } as unknown as WalletClient
}

// ---------------------------------------------------------------------------
// Sequential mock public client for deploy tests
// ---------------------------------------------------------------------------

/**
 * Creates a mock PublicClient where `computeAddress` calls return addresses
 * sequentially from the provided array, and `getDeployed`/`getOperator`
 * behavior is configurable.
 */
export function createSequentialMockPublicClient(
  computeAddresses: Address[],
  options: {
    getDeployedBehavior?:
      | 'allNew'
      | 'allExisting'
      | ((callIndex: number) => Address)
  } = {},
): PublicClient {
  let computeCallCount = 0
  let getDeployedCallCount = 0
  const behavior = options.getDeployedBehavior ?? 'allNew'

  const base = createMockPublicClient({})
  ;(base as any).readContract = async (params: {
    functionName: string
    [k: string]: unknown
  }) => {
    if (params.functionName === 'computeAddress') {
      return computeAddresses[computeCallCount++] ?? FALLBACK_COMPUTED_ADDR
    }
    if (
      params.functionName === 'getDeployed' ||
      params.functionName === 'getOperator'
    ) {
      const idx = getDeployedCallCount++
      if (behavior === 'allNew') return zeroAddress
      if (behavior === 'allExisting') return FALLBACK_COMPUTED_ADDR
      return behavior(idx)
    }
    return FALLBACK_COMPUTED_ADDR
  }

  return base
}

const FALLBACK_COMPUTED_ADDR =
  '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as Address

// ---------------------------------------------------------------------------
// PaymentInfo factory
// ---------------------------------------------------------------------------

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
