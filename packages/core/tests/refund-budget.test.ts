import type { WalletClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  refundInEscrow,
  refundPostEscrow,
} from '../src/operations/refund-budget.js'
import { makePaymentInfo } from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const
const MOCK_CALLER = '0x7777777777777777777777777777777777777777' as const
const MOCK_COLLECTOR = '0x8888888888888888888888888888888888888888' as const
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
    name: 'refundInEscrow',
    fn: refundInEscrow as (...args: any[]) => Promise<any>,
    functionName: 'refundInEscrow',
    extraArgs: [500000n],
    expectedArgs: [paymentInfo, 500000n],
  },
  {
    name: 'refundPostEscrow',
    fn: refundPostEscrow as (...args: any[]) => Promise<any>,
    functionName: 'refundPostEscrow',
    extraArgs: [1000000n, MOCK_COLLECTOR, '0xdeadbeef'],
    expectedArgs: [paymentInfo, 1000000n, MOCK_COLLECTOR, '0xdeadbeef'],
  },
]

describe('refund-budget write functions', () => {
  it.each(writeCases)('$name throws without account', async ({
    fn,
    extraArgs,
  }) => {
    await expect(
      fn(mockWalletWithoutAccount(), MOCK_OPERATOR, paymentInfo, ...extraArgs),
    ).rejects.toThrow(ContractCallError)
  })

  it.each(writeCases)('$name forwards to writeContract', async ({
    fn,
    functionName,
    extraArgs,
    expectedArgs,
  }) => {
    const wallet = mockWalletWithAccount()
    await fn(wallet, MOCK_OPERATOR, paymentInfo, ...extraArgs)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_OPERATOR,
        functionName,
        args: expectedArgs,
      }),
    )
  })
})
