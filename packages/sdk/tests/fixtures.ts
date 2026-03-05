import type { PaymentInfo } from '@x402r/core'
import type { Address, PublicClient, WalletClient } from 'viem'
import { getAddress } from 'viem'
import { baseSepolia } from 'viem/chains'

// Use getAddress for EIP-55 checksumming — all addresses must be 20 bytes (40 hex chars)
export const MOCK_OPERATOR_ADDRESS = getAddress(
  '0x1234567890abcdef1234567890abcdef12345678',
)

const MOCK_PAYER = getAddress('0x1111111111111111111111111111111111111111')
const MOCK_RECEIVER = getAddress('0x2222222222222222222222222222222222222222')
const MOCK_FEE_RECEIVER = getAddress(
  '0x3333333333333333333333333333333333333333',
)
const MOCK_ACCOUNT = getAddress('0x4444444444444444444444444444444444444444')

export function createMockPublicClient(
  overrides: Partial<PublicClient> = {},
): PublicClient {
  return {
    chain: baseSepolia,
    readContract: async () => {
      throw new Error('readContract not mocked for this call')
    },
    ...overrides,
  } as unknown as PublicClient
}

export function createMockPublicClientNoChain(): PublicClient {
  return {
    chain: undefined,
    readContract: async () => {
      throw new Error('readContract not mocked')
    },
  } as unknown as PublicClient
}

export function createMockWalletClient(
  overrides: Partial<WalletClient> = {},
): WalletClient {
  return {
    chain: baseSepolia,
    account: {
      address: MOCK_ACCOUNT,
      type: 'json-rpc',
    },
    writeContract: async () => {
      return '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    },
    ...overrides,
  } as unknown as WalletClient
}

export function createMockPaymentInfo(
  overrides: Partial<PaymentInfo> = {},
): PaymentInfo {
  return {
    operator: MOCK_OPERATOR_ADDRESS,
    payer: MOCK_PAYER,
    receiver: MOCK_RECEIVER,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    maxAmount: 1000000n,
    preApprovalExpiry: 0,
    authorizationExpiry: Math.floor(Date.now() / 1000) + 3600,
    refundExpiry: Math.floor(Date.now() / 1000) + 86400,
    minFeeBps: 0,
    maxFeeBps: 1000,
    feeReceiver: MOCK_FEE_RECEIVER,
    salt: 1n,
    ...overrides,
  } as PaymentInfo
}
