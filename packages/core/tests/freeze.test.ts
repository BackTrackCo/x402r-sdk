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
// Account checks
// ---------------------------------------------------------------------------

describe('freeze write functions throw without account', () => {
  const paymentInfo = makePaymentInfo()

  it('freezePayment throws ContractCallError', async () => {
    await expect(
      freezePayment(mockWalletWithoutAccount(), MOCK_FREEZE, paymentInfo),
    ).rejects.toThrow(ContractCallError)
  })

  it('unfreezePayment throws ContractCallError', async () => {
    await expect(
      unfreezePayment(mockWalletWithoutAccount(), MOCK_FREEZE, paymentInfo),
    ).rejects.toThrow(ContractCallError)
  })
})

// ---------------------------------------------------------------------------
// Correct args
// ---------------------------------------------------------------------------

describe('freezePayment', () => {
  it('passes paymentInfo to freeze function', async () => {
    const paymentInfo = makePaymentInfo()
    const wallet = mockWalletWithAccount()

    await freezePayment(wallet, MOCK_FREEZE, paymentInfo)

    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_FREEZE,
        functionName: 'freeze',
        args: [paymentInfo],
      }),
    )
  })
})
