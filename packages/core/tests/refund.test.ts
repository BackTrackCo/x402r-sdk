import type { WalletClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  approveRefundWithSignature,
  cancelRefundRequest,
  denyRefundRequest,
  RefundRequestStatus,
  refuseRefundRequest,
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
// Write functions — table-driven
// ---------------------------------------------------------------------------

const paymentInfo = makePaymentInfo()

const writeCases = [
  {
    name: 'requestRefund',
    fn: requestRefund as (...args: any[]) => Promise<any>,
    functionName: 'requestRefund',
    extraArgs: [100n, 0n],
    expectedArgs: [paymentInfo, 100n, 0n],
  },
  {
    name: 'approveRefundWithSignature',
    fn: approveRefundWithSignature as (...args: any[]) => Promise<any>,
    functionName: 'approveWithSignature',
    extraArgs: [1n, 200n, 2000000000, '0xdeadbeef'],
    expectedArgs: [paymentInfo, 1n, 200n, 2000000000, '0xdeadbeef'],
  },
  {
    name: 'denyRefundRequest',
    fn: denyRefundRequest as (...args: any[]) => Promise<any>,
    functionName: 'deny',
    extraArgs: [0n],
    expectedArgs: [paymentInfo, 0n],
  },
  {
    name: 'refuseRefundRequest',
    fn: refuseRefundRequest as (...args: any[]) => Promise<any>,
    functionName: 'refuse',
    extraArgs: [0n],
    expectedArgs: [paymentInfo, 0n],
  },
  {
    name: 'cancelRefundRequest',
    fn: cancelRefundRequest as (...args: any[]) => Promise<any>,
    functionName: 'cancelRefundRequest',
    extraArgs: [0n],
    expectedArgs: [paymentInfo, 0n],
  },
]

describe('refund write functions', () => {
  it.each(writeCases)('$name throws without account', async ({
    fn,
    extraArgs,
  }) => {
    await expect(
      fn(mockWalletWithoutAccount(), MOCK_CONTRACT, paymentInfo, ...extraArgs),
    ).rejects.toThrow(ContractCallError)
  })

  it.each(writeCases)('$name forwards to writeContract', async ({
    fn,
    functionName,
    extraArgs,
    expectedArgs,
  }) => {
    const wallet = mockWalletWithAccount()
    await fn(wallet, MOCK_CONTRACT, paymentInfo, ...extraArgs)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_CONTRACT,
        functionName,
        args: expectedArgs,
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// approveRefundWithSignature — explicit arg-order documentation
// ---------------------------------------------------------------------------

describe('approveRefundWithSignature', () => {
  it('maps SDK params (paymentInfo, nonce, amount, expiry, sig) to ABI approveWithSignature', async () => {
    const pi = makePaymentInfo()
    const wallet = mockWalletWithAccount()
    const sig = '0xdeadbeef' as const

    await approveRefundWithSignature(
      wallet,
      MOCK_CONTRACT,
      pi,
      1n,
      200n,
      2000000000,
      sig,
    )

    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'approveWithSignature',
        args: [pi, 1n, 200n, 2000000000, sig],
      }),
    )
  })
})
