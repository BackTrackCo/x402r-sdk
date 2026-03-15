import { describe, expect, it } from 'vitest'
import { getPayerPayment } from '../src/actions/recorder/getPayerPayment.js'
import { getPayerPaymentsFromRecorder } from '../src/actions/recorder/getPayerPayments.js'
import { getReceiverPayment } from '../src/actions/recorder/getReceiverPayment.js'
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

describe('getPayerPayment', () => {
  it('passes correct args and returns PaymentInfo', async () => {
    const client = createMockPublicClient({
      getPayerPayment: paymentInfo,
    })

    const result = await getPayerPayment(client, {
      recorderAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      index: 0n,
    })

    expect(result).toEqual(paymentInfo)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: RECORDER_ADDRESS,
        functionName: 'getPayerPayment',
        args: [TEST_ADDRESSES.payer, 0n],
      }),
    )
  })
})

describe('getReceiverPayment', () => {
  it('passes correct args and returns PaymentInfo', async () => {
    const client = createMockPublicClient({
      getReceiverPayment: paymentInfo,
    })

    const result = await getReceiverPayment(client, {
      recorderAddress: RECORDER_ADDRESS,
      receiver: TEST_ADDRESSES.receiver,
      index: 2n,
    })

    expect(result).toEqual(paymentInfo)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: RECORDER_ADDRESS,
        functionName: 'getReceiverPayment',
        args: [TEST_ADDRESSES.receiver, 2n],
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

describe('getPayerPaymentsFromRecorder — empty results', () => {
  it('returns empty payments and total 0', async () => {
    const client = createMockPublicClient({
      getPayerPayments: [[], 0n],
    })

    const result = await getPayerPaymentsFromRecorder(client, {
      recorderAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      offset: 0n,
      count: 100n,
    })

    expect(result.payments).toEqual([])
    expect(result.total).toBe(0n)
  })
})

describe('getPayerPayment — large index', () => {
  it('forwards large index correctly', async () => {
    const client = createMockPublicClient({
      getPayerPayment: paymentInfo,
    })

    const result = await getPayerPayment(client, {
      recorderAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      index: 999n,
    })

    expect(result).toEqual(paymentInfo)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: RECORDER_ADDRESS,
        functionName: 'getPayerPayment',
        args: [TEST_ADDRESSES.payer, 999n],
      }),
    )
  })
})
