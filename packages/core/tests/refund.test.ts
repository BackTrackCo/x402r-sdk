import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  getOperatorRefundRequests,
  getPayerRefundRequests,
  getReceiverRefundRequests,
  getRefundRequest,
  getRefundRequestByKey,
  RefundRequestStatus,
} from '../src/operations/refund-reads.js'
import { requestRefund } from '../src/operations/refund-writes.js'
import {
  createMockPublicClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
  TEST_ADDRESSES,
} from './fixtures.js'

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

describe('RefundRequestStatus', () => {
  it('matches Solidity enum values (Pending=0, Approved=1, Denied=2, Cancelled=3, Refused=4)', () => {
    expect(RefundRequestStatus.Pending).toBe(0)
    expect(RefundRequestStatus.Approved).toBe(1)
    expect(RefundRequestStatus.Denied).toBe(2)
    expect(RefundRequestStatus.Cancelled).toBe(3)
    expect(RefundRequestStatus.Refused).toBe(4)
  })
})

describe('refund read functions', () => {
  const pi = makePaymentInfo()

  it('getRefundRequest returns mapped object', async () => {
    const mockData = {
      paymentInfoHash: '0xabc' as const,
      nonce: 1n,
      amount: 100n,
      status: 0,
    }
    const client = createMockPublicClient({ getRefundRequest: mockData })
    const result = await getRefundRequest(client, MOCK_CONTRACT, pi, 1n)
    expect(result).toEqual(mockData)
  })

  it('getPayerRefundRequests returns keys and total', async () => {
    const mockKeys = ['0xabc', '0xdef'] as const
    const client = createMockPublicClient({
      getPayerRefundRequests: [mockKeys, 2n],
    })
    const result = await getPayerRefundRequests(
      client,
      MOCK_CONTRACT,
      TEST_ADDRESSES.payer as `0x${string}`,
      0n,
      10n,
    )
    expect(result.keys).toEqual(mockKeys)
    expect(result.total).toBe(2n)
  })

  it('getReceiverRefundRequests returns keys and total', async () => {
    const client = createMockPublicClient({
      getReceiverRefundRequests: [[], 0n],
    })
    const result = await getReceiverRefundRequests(
      client,
      MOCK_CONTRACT,
      TEST_ADDRESSES.receiver as `0x${string}`,
      0n,
      10n,
    )
    expect(result.keys).toEqual([])
    expect(result.total).toBe(0n)
  })

  it('getOperatorRefundRequests returns keys and total', async () => {
    const client = createMockPublicClient({
      getOperatorRefundRequests: [[], 0n],
    })
    const result = await getOperatorRefundRequests(
      client,
      MOCK_CONTRACT,
      TEST_ADDRESSES.operator as `0x${string}`,
      0n,
      10n,
    )
    expect(result.keys).toEqual([])
    expect(result.total).toBe(0n)
  })

  it('getRefundRequestByKey returns mapped object', async () => {
    const mockData = {
      paymentInfoHash: '0xabc' as const,
      nonce: 0n,
      amount: 200n,
      status: 1,
    }
    const client = createMockPublicClient({ getRefundRequestByKey: mockData })
    const result = await getRefundRequestByKey(
      client,
      MOCK_CONTRACT,
      '0xabc' as `0x${string}`,
    )
    expect(result).toEqual(mockData)
  })
})

describe('refund write functions', () => {
  it('requestRefund throws without account', async () => {
    await expect(
      requestRefund(
        createMockWalletWithoutAccount(),
        MOCK_CONTRACT,
        makePaymentInfo(),
        100n,
        0n,
      ),
    ).rejects.toThrow(ContractCallError)
  })
})
