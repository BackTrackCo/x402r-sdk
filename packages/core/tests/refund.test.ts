import type { WalletClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  approveRefundWithSignature,
  denyRefundRequest,
  RefundRequestStatus,
  requestRefund,
} from '../src/operations/refund.js'
import { makePaymentInfo } from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const
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
// RefundRequestStatus
// ---------------------------------------------------------------------------

describe('RefundRequestStatus', () => {
  it('matches Solidity enum values', () => {
    expect(RefundRequestStatus.Pending).toBe(0)
    expect(RefundRequestStatus.Approved).toBe(1)
    expect(RefundRequestStatus.Denied).toBe(2)
    expect(RefundRequestStatus.Refused).toBe(3)
    expect(RefundRequestStatus.Cancelled).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Write functions — account check
// ---------------------------------------------------------------------------

describe('refund write functions throw without account', () => {
  const paymentInfo = makePaymentInfo()

  it('requestRefund throws ContractCallError', async () => {
    await expect(
      requestRefund(
        mockWalletWithoutAccount(),
        MOCK_CONTRACT,
        paymentInfo,
        100n,
        0n,
      ),
    ).rejects.toThrow(ContractCallError)
  })

  it('approveRefundWithSignature throws ContractCallError', async () => {
    await expect(
      approveRefundWithSignature(
        mockWalletWithoutAccount(),
        MOCK_CONTRACT,
        paymentInfo,
        0n,
        100n,
        2000000000,
        '0xabcd',
      ),
    ).rejects.toThrow(ContractCallError)
  })

  it('denyRefundRequest throws ContractCallError', async () => {
    await expect(
      denyRefundRequest(
        mockWalletWithoutAccount(),
        MOCK_CONTRACT,
        paymentInfo,
        0n,
      ),
    ).rejects.toThrow(ContractCallError)
  })
})

// ---------------------------------------------------------------------------
// requestRefund — arg ordering
// ---------------------------------------------------------------------------

describe('requestRefund', () => {
  it('passes args in correct order (paymentInfo, amount, nonce)', async () => {
    const paymentInfo = makePaymentInfo()
    const wallet = mockWalletWithAccount()

    await requestRefund(wallet, MOCK_CONTRACT, paymentInfo, 500n, 1n)

    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_CONTRACT,
        functionName: 'requestRefund',
        args: [paymentInfo, 500n, 1n],
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// approveRefundWithSignature — arg ordering
// ---------------------------------------------------------------------------

describe('approveRefundWithSignature', () => {
  it('passes all 5 args in correct order', async () => {
    const paymentInfo = makePaymentInfo()
    const wallet = mockWalletWithAccount()
    const sig = '0xdeadbeef' as const

    await approveRefundWithSignature(
      wallet,
      MOCK_CONTRACT,
      paymentInfo,
      1n,
      200n,
      2000000000,
      sig,
    )

    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'approveWithSignature',
        args: [paymentInfo, 1n, 200n, 2000000000, sig],
      }),
    )
  })
})
