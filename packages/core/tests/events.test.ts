import type { PublicClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { getPayerPaymentsByEvents } from '../src/actions/events/getPayerPaymentsByEvents.js'
import { getReceiverPaymentsByEvents } from '../src/actions/events/getReceiverPaymentsByEvents.js'
import { makePaymentInfo, TEST_ADDRESSES } from './fixtures.js'

const paymentInfo = makePaymentInfo()

function createLogsClient(logs: unknown[]): PublicClient {
  return {
    getLogs: vi.fn().mockResolvedValue(logs),
  } as unknown as PublicClient
}

function makeLog(info: typeof paymentInfo) {
  return { args: { paymentInfo: info } }
}

describe('getPayerPaymentsByEvents', () => {
  it('extracts paymentInfo from AuthorizationCreated logs', async () => {
    const client = createLogsClient([makeLog(paymentInfo)])

    const results = await getPayerPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      payer: TEST_ADDRESSES.payer,
    })

    expect(results).toEqual([paymentInfo])
    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TEST_ADDRESSES.operator,
        args: { payer: TEST_ADDRESSES.payer },
      }),
    )
  })
})

describe('getReceiverPaymentsByEvents', () => {
  it('extracts paymentInfo from AuthorizationCreated logs', async () => {
    const client = createLogsClient([makeLog(paymentInfo)])

    const results = await getReceiverPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      receiver: TEST_ADDRESSES.receiver,
    })

    expect(results).toEqual([paymentInfo])
    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TEST_ADDRESSES.operator,
        args: { receiver: TEST_ADDRESSES.receiver },
      }),
    )
  })
})

describe('event actions with empty logs', () => {
  it('returns empty array when no logs found', async () => {
    const client = createLogsClient([])

    const payerResults = await getPayerPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      payer: TEST_ADDRESSES.payer,
    })
    const receiverResults = await getReceiverPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      receiver: TEST_ADDRESSES.receiver,
    })

    expect(payerResults).toEqual([])
    expect(receiverResults).toEqual([])
  })
})

describe('getPayerPaymentsByEvents — multiple events', () => {
  it('extracts all PaymentInfo from multiple logs', async () => {
    const info1 = makePaymentInfo({ salt: 1n })
    const info2 = makePaymentInfo({ salt: 2n })
    const info3 = makePaymentInfo({ salt: 3n })
    const client = createLogsClient([
      makeLog(info1),
      makeLog(info2),
      makeLog(info3),
    ])

    const results = await getPayerPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      payer: TEST_ADDRESSES.payer,
    })

    expect(results).toEqual([info1, info2, info3])
    expect(results).toHaveLength(3)
  })
})

describe('getPayerPaymentsByEvents — fromBlock/toBlock forwarding', () => {
  it('passes fromBlock and toBlock to getLogs', async () => {
    const client = createLogsClient([])

    await getPayerPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      payer: TEST_ADDRESSES.payer,
      fromBlock: 1000n,
      toBlock: 2000n,
    })

    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBlock: 1000n,
        toBlock: 2000n,
      }),
    )
  })

  it('defaults toBlock to latest when not specified', async () => {
    const client = createLogsClient([])

    await getPayerPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      payer: TEST_ADDRESSES.payer,
      fromBlock: 500n,
    })

    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBlock: 500n,
        toBlock: 'latest',
      }),
    )
  })
})

describe('getReceiverPaymentsByEvents — receiver arg filtering', () => {
  it('passes receiver in args to getLogs', async () => {
    const client = createLogsClient([])

    await getReceiverPaymentsByEvents(client, {
      operatorAddress: TEST_ADDRESSES.operator,
      receiver: TEST_ADDRESSES.receiver,
      fromBlock: 0n,
    })

    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TEST_ADDRESSES.operator,
        args: { receiver: TEST_ADDRESSES.receiver },
      }),
    )
  })
})
