import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  approveRefundWithSignature,
  cancelRefundRequest,
  denyRefundRequest,
  getRefundRequest,
  getRefundRequestStatus,
  hasRefundRequest,
  type RefundRequestData,
  RefundRequestStatus,
  refuseRefundRequest,
  requestRefund,
} from '../src/operations/refund.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// Enum guard — must match Solidity values
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
// Helpers
// ---------------------------------------------------------------------------

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

describe('refund read functions', () => {
  const pi = makePaymentInfo()

  it('hasRefundRequest returns true', async () => {
    const client = createMockPublicClient({ hasRefundRequest: true })
    expect(await hasRefundRequest(client, MOCK_CONTRACT, pi, 0n)).toBe(true)
  })

  it('hasRefundRequest returns false', async () => {
    const client = createMockPublicClient({ hasRefundRequest: false })
    expect(await hasRefundRequest(client, MOCK_CONTRACT, pi, 0n)).toBe(false)
  })

  it('getRefundRequestStatus returns enum value', async () => {
    const client = createMockPublicClient({
      getRefundRequestStatus: RefundRequestStatus.Approved,
    })
    const status = await getRefundRequestStatus(client, MOCK_CONTRACT, pi, 0n)
    expect(status).toBe(RefundRequestStatus.Approved)
  })

  it('getRefundRequest returns full data', async () => {
    const mockData: RefundRequestData = {
      paymentInfoHash:
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      nonce: 1n,
      amount: 500000n,
      status: RefundRequestStatus.Pending,
    }
    const client = createMockPublicClient({ getRefundRequest: mockData })
    const result = await getRefundRequest(client, MOCK_CONTRACT, pi, 1n)
    expect(result).toEqual(mockData)
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
      fn(
        createMockWalletWithoutAccount(),
        MOCK_CONTRACT,
        paymentInfo,
        ...extraArgs,
      ),
    ).rejects.toThrow(ContractCallError)
  })

  it.each(writeCases)('$name forwards to writeContract', async ({
    fn,
    functionName,
    extraArgs,
    expectedArgs,
  }) => {
    const wallet = createMockWalletClient()
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
