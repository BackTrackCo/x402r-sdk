import { describe, expect, it } from 'vitest'
import { getHookPaymentInfo } from '../src/actions/hook/getHookPaymentInfo.js'
import { getPayerPayment } from '../src/actions/hook/getPayerPayment.js'
import { getPayerPaymentsFromHook } from '../src/actions/hook/getPayerPayments.js'
import { getReceiverPayment } from '../src/actions/hook/getReceiverPayment.js'
import { getReceiverPaymentsFromHook } from '../src/actions/hook/getReceiverPayments.js'
import {
  createMockPublicClient,
  makePaymentInfo,
  TEST_ADDRESSES,
  zeroAddress,
} from './fixtures.js'

const RECORDER_ADDRESS = '0xcafecafecafecafecafecafecafecafecafecafe' as const
const paymentInfo = makePaymentInfo()

describe('getPayerPaymentsFromHook', () => {
  it('passes correct args and returns { payments, total }', async () => {
    const client = createMockPublicClient({
      getPayerPayments: [[paymentInfo], 1n],
    })

    const result = await getPayerPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
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

describe('getReceiverPaymentsFromHook', () => {
  it('passes correct args and returns { payments, total }', async () => {
    const client = createMockPublicClient({
      getReceiverPayments: [[paymentInfo], 1n],
    })

    const result = await getReceiverPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
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
      hookAddress: RECORDER_ADDRESS,
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
      hookAddress: RECORDER_ADDRESS,
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

describe('getHookPaymentInfo', () => {
  it('returns PaymentInfo when found', async () => {
    const client = createMockPublicClient({
      getPaymentInfo: paymentInfo,
    })

    const result = await getHookPaymentInfo(client, {
      hookAddress: RECORDER_ADDRESS,
      hash: '0xdeadbeef',
    })

    expect(result).toEqual(paymentInfo)
  })

  it('returns null when operator is zero address', async () => {
    const emptyInfo = makePaymentInfo({ operator: zeroAddress })
    const client = createMockPublicClient({
      getPaymentInfo: emptyInfo,
    })

    const result = await getHookPaymentInfo(client, {
      hookAddress: RECORDER_ADDRESS,
      hash: '0xdeadbeef',
    })

    expect(result).toBeNull()
  })
})

describe('getPayerPaymentsFromHook — empty results', () => {
  it('returns empty payments and total 0', async () => {
    const client = createMockPublicClient({
      getPayerPayments: [[], 0n],
    })

    const result = await getPayerPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
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
      hookAddress: RECORDER_ADDRESS,
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
