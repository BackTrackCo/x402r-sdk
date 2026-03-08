import type { PaymentInfo, X402rChainConfig } from '@x402r/core'
import { createPublicClient, createWalletClient, http, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { describe, expect, it, vi } from 'vitest'
import { canExecute } from '../src/can-execute.js'
import type { ResolvedConfig } from '../src/types.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@x402r/core')>()
  return {
    ...actual,
    getConditionAddress: vi.fn(),
  }
})

import { getConditionAddress } from '@x402r/core'

const mockGetConditionAddress = vi.mocked(getConditionAddress)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const
const account = privateKeyToAccount(TEST_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account,
})

const config: ResolvedConfig = {
  publicClient,
  walletClient,
  operatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
  chainId: 84532,
  chainConfig: {} as X402rChainConfig,
  refundRequestAddress: '0x45af78aaBC0A0dD70f16381CfD6D657Ab441B7a0',
  refundRequestEvidenceAddress: '0xF97aAB816b7cbe53025454ad05b03cf5C361F1BA',
  escrowPeriodAddress: undefined,
  freezeAddress: undefined,
}

const mockPaymentInfo = {
  operator: '0x1234567890abcdef1234567890abcdef12345678',
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
} as unknown as PaymentInfo

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('canExecute', () => {
  it('returns true when condition is zeroAddress (no condition set)', async () => {
    mockGetConditionAddress.mockResolvedValue(zeroAddress)

    const result = await canExecute(
      config,
      'RELEASE_CONDITION',
      mockPaymentInfo,
      1000000n,
    )
    expect(result).toBe(true)
  })

  it('propagates errors from getConditionAddress', async () => {
    const { BaseError } = await import('viem')
    mockGetConditionAddress.mockRejectedValue(
      new BaseError('Contract call failed'),
    )

    // canExecute should propagate errors from getConditionAddress since
    // those are not from the condition.check() call
    await expect(
      canExecute(config, 'RELEASE_CONDITION', mockPaymentInfo, 1000000n),
    ).rejects.toThrow()
  })

  it('uses walletClient account as caller when available', async () => {
    mockGetConditionAddress.mockResolvedValue(
      '0x5555555555555555555555555555555555555555',
    )

    const spy = vi.spyOn(publicClient, 'readContract').mockResolvedValue(true)

    await canExecute(config, 'RELEASE_CONDITION', mockPaymentInfo, 1000000n)

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([account.address]),
      }),
    )

    spy.mockRestore()
  })

  it('uses zeroAddress as caller when no walletClient', async () => {
    mockGetConditionAddress.mockResolvedValue(
      '0x5555555555555555555555555555555555555555',
    )

    const configNoWallet = { ...config, walletClient: undefined }
    const spy = vi.spyOn(publicClient, 'readContract').mockResolvedValue(true)

    await canExecute(
      configNoWallet,
      'RELEASE_CONDITION',
      mockPaymentInfo,
      1000000n,
    )

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([zeroAddress]),
      }),
    )

    spy.mockRestore()
  })

  it('returns false when condition.check reverts', async () => {
    const { BaseError } = await import('viem')
    mockGetConditionAddress.mockResolvedValue(
      '0x5555555555555555555555555555555555555555',
    )

    const spy = vi
      .spyOn(publicClient, 'readContract')
      .mockRejectedValue(new BaseError('Condition check reverted'))

    const result = await canExecute(
      config,
      'RELEASE_CONDITION',
      mockPaymentInfo,
      1000000n,
    )
    expect(result).toBe(false)

    spy.mockRestore()
  })
})
