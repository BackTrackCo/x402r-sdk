import { zeroAddress } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { canExecute } from '../src/can-execute.js'
import {
  account,
  createTestConfig,
  mockPaymentInfo,
  publicClient,
} from './fixtures.js'

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

const config = createTestConfig()

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

    const configNoWallet = createTestConfig({ walletClient: undefined })
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
