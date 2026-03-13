import { describe, expect, it } from 'vitest'
import { getPayerPaymentsFromRecorder } from '../src/actions/recorder/getPayerPayments.js'
import { getReceiverPaymentsFromRecorder } from '../src/actions/recorder/getReceiverPayments.js'
import { getRecorderPaymentInfo } from '../src/actions/recorder/getRecorderPaymentInfo.js'
import {
  createMockPublicClient,
  makePaymentInfo,
  TEST_ADDRESSES,
  zeroAddress,
} from './fixtures.js'

const RECORDER_ADDRESS = '0xcafecafecafecafecafecafecafecafecafecafe' as const
const paymentInfo = makePaymentInfo()

describe('getPayerPaymentsFromRecorder', () => {
  it('passes correct args and returns { payments, total }', async () => {
    const client = createMockPublicClient({
      getPayerPayments: [[paymentInfo], 1n],
    })

    const result = await getPayerPaymentsFromRecorder(client, {
      recorderAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      offset: 0n,
      count: 100n,
    })

    expect(result.payments).toEqual([paymentInfo])
    expect(result.total).toBe(1n)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: RECORDER_ADDRESS,
        functionName: 'getPayerPayments',
        args: [TEST_ADDRESSES.payer, 0n, 100n],
      }),
    )
  })
})

describe('getReceiverPaymentsFromRecorder', () => {
  it('passes correct args and returns { payments, total }', async () => {
    const client = createMockPublicClient({
      getReceiverPayments: [[paymentInfo], 1n],
    })

    const result = await getReceiverPaymentsFromRecorder(client, {
      recorderAddress: RECORDER_ADDRESS,
      receiver: TEST_ADDRESSES.receiver,
      offset: 0n,
      count: 50n,
    })

    expect(result.payments).toEqual([paymentInfo])
    expect(result.total).toBe(1n)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'getReceiverPayments',
        args: [TEST_ADDRESSES.receiver, 0n, 50n],
      }),
    )
  })
})

describe('getRecorderPaymentInfo', () => {
  it('returns PaymentInfo when found', async () => {
    const client = createMockPublicClient({
      getPaymentInfo: paymentInfo,
    })

    const result = await getRecorderPaymentInfo(client, {
      recorderAddress: RECORDER_ADDRESS,
      hash: '0xdeadbeef',
    })

    expect(result).toEqual(paymentInfo)
  })

  it('returns null when operator is zero address', async () => {
    const emptyInfo = makePaymentInfo({ operator: zeroAddress })
    const client = createMockPublicClient({
      getPaymentInfo: emptyInfo,
    })

    const result = await getRecorderPaymentInfo(client, {
      recorderAddress: RECORDER_ADDRESS,
      hash: '0xdeadbeef',
    })

    expect(result).toBeNull()
  })
})
