import { getChainConfig, type PaymentInfo } from '@x402r/core'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import type { ResolvedConfig } from '../src/types.js'

export const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const
export const account = privateKeyToAccount(TEST_PRIVATE_KEY)

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
})

export const TEST_OPERATOR =
  '0x1234567890abcdef1234567890abcdef12345678' as const
export const TEST_REFUND_REQUEST =
  '0xbEEFbEEFbEEFbEEFbEEFbEEFbEEFbEEFbEEFbEEF' as const
export const TEST_EVIDENCE =
  '0x1F1272258E49825976B264c3EEBe52bd05d1f186' as const
export const TEST_ESCROW_PERIOD =
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as const
export const TEST_FREEZE = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const
export const mockPaymentInfo = {
  operator: TEST_OPERATOR,
  payer: '0x2234567890abcdef1234567890abcdef12345678',
  receiver: '0x3234567890abcdef1234567890abcdef12345678',
  token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  maxAmount: 1000000n,
  preApprovalExpiry: 0,
  authorizationExpiry: 1700000000,
  refundExpiry: 1700086400,
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: '0x4234567890abcdef1234567890abcdef12345678',
  salt: 1n,
} satisfies PaymentInfo

export function createTestConfig(
  overrides?: Partial<ResolvedConfig>,
): ResolvedConfig {
  return {
    publicClient,
    walletClient,
    operatorAddress: TEST_OPERATOR,
    chainId: 84532,
    chainConfig: getChainConfig(84532),
    refundRequestAddress: TEST_REFUND_REQUEST,
    refundRequestEvidenceAddress: TEST_EVIDENCE,
    escrowPeriodAddress: undefined,
    freezeAddress: undefined,
    ...overrides,
  }
}
