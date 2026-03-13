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
