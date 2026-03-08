import { describe, expect, it } from 'vitest'
import { getOperatorRefundRequests } from '../src/actions/refund/getOperatorRefundRequests.js'
import { getPayerRefundRequests } from '../src/actions/refund/getPayerRefundRequests.js'
import { getReceiverRefundRequests } from '../src/actions/refund/getReceiverRefundRequests.js'
import { getRefundRequest } from '../src/actions/refund/getRefundRequest.js'
import { getRefundRequestByKey } from '../src/actions/refund/getRefundRequestByKey.js'
import { RefundRequestStatus } from '../src/actions/refund/types.js'
import {
  createMockPublicClient,
  makePaymentInfo,
  TEST_ADDRESSES,
} from './fixtures.js'

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

// Guards parity between the TypeScript enum and Solidity's RefundRequestStatus enum ordering
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
    const result = await getRefundRequest(client, {
      contractAddress: MOCK_CONTRACT,
      paymentInfo: pi,
      nonce: 1n,
    })
    expect(result).toEqual(mockData)
  })

  it('getPayerRefundRequests returns keys and total', async () => {
    const mockKeys = ['0xabc', '0xdef'] as const
    const client = createMockPublicClient({
      getPayerRefundRequests: [mockKeys, 2n],
    })
    const result = await getPayerRefundRequests(client, {
      contractAddress: MOCK_CONTRACT,
      payer: TEST_ADDRESSES.payer as `0x${string}`,
      offset: 0n,
      count: 10n,
    })
    expect(result.keys).toEqual(mockKeys)
    expect(result.total).toBe(2n)
  })

  it('getReceiverRefundRequests returns keys and total', async () => {
    const client = createMockPublicClient({
      getReceiverRefundRequests: [[], 0n],
    })
    const result = await getReceiverRefundRequests(client, {
      contractAddress: MOCK_CONTRACT,
      receiver: TEST_ADDRESSES.receiver as `0x${string}`,
      offset: 0n,
      count: 10n,
    })
    expect(result.keys).toEqual([])
    expect(result.total).toBe(0n)
  })

  it('getOperatorRefundRequests returns keys and total', async () => {
    const client = createMockPublicClient({
      getOperatorRefundRequests: [[], 0n],
    })
    const result = await getOperatorRefundRequests(client, {
      contractAddress: MOCK_CONTRACT,
      operator: TEST_ADDRESSES.operator as `0x${string}`,
      offset: 0n,
      count: 10n,
    })
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
    const result = await getRefundRequestByKey(client, {
      contractAddress: MOCK_CONTRACT,
      compositeKey: '0xabc' as `0x${string}`,
    })
    expect(result).toEqual(mockData)
  })
})
