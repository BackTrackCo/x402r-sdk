import type { WalletClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { freezePayment, unfreezePayment } from '../src/operations/freeze.js'
import { makePaymentInfo } from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_FREEZE = '0x1111111111111111111111111111111111111111' as const
const MOCK_CALLER = '0x7777777777777777777777777777777777777777' as const
const MOCK_HASH =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const

const mockWalletWithAccount = () =>
  ({
    writeContract: vi.fn().mockResolvedValue(MOCK_HASH),
    chain: { id: 84532 },
    account: { address: MOCK_CALLER },
  }) as unknown as WalletClient

const mockWalletWithoutAccount = () =>
  ({
    writeContract: vi.fn(),
    chain: { id: 84532 },
    account: undefined,
  }) as unknown as WalletClient

// ---------------------------------------------------------------------------
// Write functions — table-driven
// ---------------------------------------------------------------------------

const paymentInfo = makePaymentInfo()

const writeCases = [
  {
    name: 'freezePayment',
    fn: freezePayment as (...args: any[]) => Promise<any>,
    functionName: 'freeze',
    extraArgs: [] as unknown[],
    expectedArgs: [paymentInfo],
  },
  {
    name: 'unfreezePayment',
    fn: unfreezePayment as (...args: any[]) => Promise<any>,
    functionName: 'unfreeze',
    extraArgs: [] as unknown[],
    expectedArgs: [paymentInfo],
  },
]

describe('freeze write functions', () => {
  it.each(writeCases)('$name throws without account', async ({
    fn,
    extraArgs,
  }) => {
    await expect(
      fn(mockWalletWithoutAccount(), MOCK_FREEZE, paymentInfo, ...extraArgs),
    ).rejects.toThrow(ContractCallError)
  })

  it.each(writeCases)('$name forwards to writeContract', async ({
    fn,
    functionName,
    extraArgs,
    expectedArgs,
  }) => {
    const wallet = mockWalletWithAccount()
    await fn(wallet, MOCK_FREEZE, paymentInfo, ...extraArgs)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_FREEZE,
        functionName,
        args: expectedArgs,
      }),
    )
  })
})
