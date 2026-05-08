import { getAddress } from 'viem'
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

// ---------------------------------------------------------------------------
// Cross-operator aggregation: operatorAddress filter
// ---------------------------------------------------------------------------

const OPERATOR_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const
const OPERATOR_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const

describe('getPayerPaymentsFromHook — operatorAddress filter', () => {
  it('returns all payments when operatorAddress is undefined', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const opB = makePaymentInfo({ operator: OPERATOR_B })
    const client = createMockPublicClient({
      getPayerPayments: [[opA, opB, opA], 3n],
    })

    const result = await getPayerPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      offset: 0n,
      count: 100n,
    })

    expect(result.payments).toHaveLength(3)
  })

  it('filters payments by operatorAddress when set', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const opB = makePaymentInfo({ operator: OPERATOR_B })
    const client = createMockPublicClient({
      getPayerPayments: [[opA, opB, opA], 3n],
    })

    const result = await getPayerPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      offset: 0n,
      count: 100n,
      operatorAddress: OPERATOR_A,
    })

    expect(result.payments).toHaveLength(2)
    expect(result.payments.every((p) => p.operator === OPERATOR_A)).toBe(true)
  })

  it('total reflects pre-filter count even when filtered', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const opB = makePaymentInfo({ operator: OPERATOR_B })
    const client = createMockPublicClient({
      getPayerPayments: [[opA, opB, opA], 5n],
    })

    const result = await getPayerPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      offset: 0n,
      count: 100n,
      operatorAddress: OPERATOR_A,
    })

    expect(result.total).toBe(5n)
    expect(result.payments).toHaveLength(2)
  })
})

describe('getReceiverPaymentsFromHook — operatorAddress filter', () => {
  it('filters payments by operatorAddress when set', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const opB = makePaymentInfo({ operator: OPERATOR_B })
    const client = createMockPublicClient({
      getReceiverPayments: [[opA, opB], 2n],
    })

    const result = await getReceiverPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
      receiver: TEST_ADDRESSES.receiver,
      offset: 0n,
      count: 50n,
      operatorAddress: OPERATOR_B,
    })

    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].operator).toBe(OPERATOR_B)
    expect(result.total).toBe(2n)
  })
})

describe('getHookPaymentInfo — operatorAddress filter', () => {
  it('returns null when operatorAddress mismatches', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const client = createMockPublicClient({
      getPaymentInfo: opA,
    })

    const result = await getHookPaymentInfo(client, {
      hookAddress: RECORDER_ADDRESS,
      hash: '0xdeadbeef',
      operatorAddress: OPERATOR_B,
    })

    expect(result).toBeNull()
  })

  it('returns the payment when operatorAddress matches', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const client = createMockPublicClient({
      getPaymentInfo: opA,
    })

    const result = await getHookPaymentInfo(client, {
      hookAddress: RECORDER_ADDRESS,
      hash: '0xdeadbeef',
      operatorAddress: OPERATOR_A,
    })

    expect(result).toEqual(opA)
  })
})

describe('getPayerPayment / getReceiverPayment — operatorAddress filter', () => {
  it('getPayerPayment returns null when operatorAddress mismatches', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const client = createMockPublicClient({
      getPayerPayment: opA,
    })

    const result = await getPayerPayment(client, {
      hookAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      index: 0n,
      operatorAddress: OPERATOR_B,
    })

    expect(result).toBeNull()
  })

  it('getReceiverPayment returns the payment when operatorAddress matches', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A })
    const client = createMockPublicClient({
      getReceiverPayment: opA,
    })

    const result = await getReceiverPayment(client, {
      hookAddress: RECORDER_ADDRESS,
      receiver: TEST_ADDRESSES.receiver,
      index: 0n,
      operatorAddress: OPERATOR_A,
    })

    expect(result).toEqual(opA)
  })
})

// ---------------------------------------------------------------------------
// operatorAddress case-sensitivity (regression guard)
// ---------------------------------------------------------------------------
//
// On-chain reads return checksummed addresses; caller-supplied
// `operatorAddress` may be lowercased (URL params, env vars). All five hook
// reads must normalize via getAddress() before strict-equal compare or the
// filter silently returns empty/null on case mismatch.

describe('operatorAddress case-sensitivity', () => {
  // OPERATOR_A above is fully lowercased; derive its EIP-55 checksum form
  // via getAddress() so the mock returns the canonical on-chain casing while
  // the caller passes the lowercased form. The filter MUST treat them as
  // equal — strict `===` would silently miss matches.
  const OPERATOR_A_LOWER = OPERATOR_A
  const OPERATOR_A_CHECKSUMMED = getAddress(OPERATOR_A)

  it('getPayerPaymentsFromHook matches lowercased caller arg against checksummed on-chain operator', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A_CHECKSUMMED })
    const client = createMockPublicClient({
      getPayerPayments: [[opA], 1n],
    })

    const result = await getPayerPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      offset: 0n,
      count: 100n,
      operatorAddress: OPERATOR_A_LOWER,
    })

    expect(result.payments).toHaveLength(1)
  })

  it('getReceiverPaymentsFromHook matches lowercased caller arg', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A_CHECKSUMMED })
    const client = createMockPublicClient({
      getReceiverPayments: [[opA], 1n],
    })

    const result = await getReceiverPaymentsFromHook(client, {
      hookAddress: RECORDER_ADDRESS,
      receiver: TEST_ADDRESSES.receiver,
      offset: 0n,
      count: 50n,
      operatorAddress: OPERATOR_A_LOWER,
    })

    expect(result.payments).toHaveLength(1)
  })

  it('getHookPaymentInfo matches lowercased caller arg', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A_CHECKSUMMED })
    const client = createMockPublicClient({
      getPaymentInfo: opA,
    })

    const result = await getHookPaymentInfo(client, {
      hookAddress: RECORDER_ADDRESS,
      hash: '0xdeadbeef',
      operatorAddress: OPERATOR_A_LOWER,
    })

    expect(result).toEqual(opA)
  })

  it('getPayerPayment matches lowercased caller arg', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A_CHECKSUMMED })
    const client = createMockPublicClient({
      getPayerPayment: opA,
    })

    const result = await getPayerPayment(client, {
      hookAddress: RECORDER_ADDRESS,
      payer: TEST_ADDRESSES.payer,
      index: 0n,
      operatorAddress: OPERATOR_A_LOWER,
    })

    expect(result).toEqual(opA)
  })

  it('getReceiverPayment matches lowercased caller arg', async () => {
    const opA = makePaymentInfo({ operator: OPERATOR_A_CHECKSUMMED })
    const client = createMockPublicClient({
      getReceiverPayment: opA,
    })

    const result = await getReceiverPayment(client, {
      hookAddress: RECORDER_ADDRESS,
      receiver: TEST_ADDRESSES.receiver,
      index: 0n,
      operatorAddress: OPERATOR_A_LOWER,
    })

    expect(result).toEqual(opA)
  })
})
