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
// Account checks
// ---------------------------------------------------------------------------

describe('refund-budget write functions throw without account', () => {
  const paymentInfo = makePaymentInfo()

  it('refundInEscrow throws ContractCallError', async () => {
    await expect(
      refundInEscrow(
        mockWalletWithoutAccount(),
        MOCK_OPERATOR,
        paymentInfo,
        100n,
      ),
    ).rejects.toThrow(ContractCallError)
  })

  it('refundPostEscrow throws ContractCallError', async () => {
    await expect(
      refundPostEscrow(
        mockWalletWithoutAccount(),
        MOCK_OPERATOR,
        paymentInfo,
        100n,
        MOCK_COLLECTOR,
        '0x',
      ),
    ).rejects.toThrow(ContractCallError)
  })
})

// ---------------------------------------------------------------------------
// Correct args
// ---------------------------------------------------------------------------

describe('refundInEscrow', () => {
  it('passes paymentInfo and amount correctly', async () => {
    const paymentInfo = makePaymentInfo()
    const wallet = mockWalletWithAccount()

    await refundInEscrow(wallet, MOCK_OPERATOR, paymentInfo, 500000n)

    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_OPERATOR,
        functionName: 'refundInEscrow',
        args: [paymentInfo, 500000n],
      }),
    )
  })
})

describe('refundPostEscrow', () => {
  it('passes all 4 args (paymentInfo, amount, tokenCollector, collectorData)', async () => {
    const paymentInfo = makePaymentInfo()
    const wallet = mockWalletWithAccount()
    const data = '0xdeadbeef' as const

    await refundPostEscrow(
      wallet,
      MOCK_OPERATOR,
      paymentInfo,
      1000000n,
      MOCK_COLLECTOR,
      data,
    )

    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_OPERATOR,
        functionName: 'refundPostEscrow',
        args: [paymentInfo, 1000000n, MOCK_COLLECTOR, data],
      }),
    )
  })
})
