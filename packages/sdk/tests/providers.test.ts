import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPaymentInfo } from './fixtures.js'

const mockGetPayerPaymentsFromRecorder = vi.fn()
const mockGetReceiverPaymentsFromRecorder = vi.fn()
const mockGetRecorderPaymentInfo = vi.fn()
const mockGetPayerPaymentsByEvents = vi.fn()
const mockGetReceiverPaymentsByEvents = vi.fn()

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getPayerPaymentsFromRecorder: (...args: unknown[]) =>
      mockGetPayerPaymentsFromRecorder(...args),
    getReceiverPaymentsFromRecorder: (...args: unknown[]) =>
      mockGetReceiverPaymentsFromRecorder(...args),
    getRecorderPaymentInfo: (...args: unknown[]) =>
      mockGetRecorderPaymentInfo(...args),
    getPayerPaymentsByEvents: (...args: unknown[]) =>
      mockGetPayerPaymentsByEvents(...args),
    getReceiverPaymentsByEvents: (...args: unknown[]) =>
      mockGetReceiverPaymentsByEvents(...args),
  }
})

import type { PaymentInfo } from '@x402r/core'
import type { PublicClient } from 'viem'
import {
  createEventProvider,
  createRecorderProvider,
  createStoreProvider,
} from '../src/resolver/providers.js'
import type { PaymentStore } from '../src/store/types.js'

const RECORDER = '0xcafecafecafecafecafecafecafecafecafecafe' as const
const OPERATOR = '0x1234567890abcdef1234567890abcdef12345678' as const
const PAYER = '0x2234567890abcdef1234567890abcdef12345678' as const
const RECEIVER = '0x3234567890abcdef1234567890abcdef12345678' as const
const HASH = '0xdeadbeef' as const

const mockPublicClient = {} as PublicClient

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createStoreProvider
// ---------------------------------------------------------------------------

describe('createStoreProvider', () => {
  it('delegates getByPayer to store', async () => {
    const store: PaymentStore = {
      getByPayer: vi.fn().mockResolvedValue([mockPaymentInfo]),
      getByReceiver: vi.fn().mockResolvedValue([]),
      getByHash: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      remove: vi.fn(),
    }
    const provider = createStoreProvider(store)

    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([mockPaymentInfo])
    expect(store.getByPayer).toHaveBeenCalledWith(84532, PAYER)
  })

  it('delegates getByReceiver to store', async () => {
    const store: PaymentStore = {
      getByPayer: vi.fn().mockResolvedValue([]),
      getByReceiver: vi.fn().mockResolvedValue([mockPaymentInfo]),
      getByHash: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      remove: vi.fn(),
    }
    const provider = createStoreProvider(store)

    const result = await provider.getByReceiver(84532, RECEIVER)

    expect(result).toEqual([mockPaymentInfo])
    expect(store.getByReceiver).toHaveBeenCalledWith(84532, RECEIVER)
  })

  it('delegates getByHash to store', async () => {
    const store: PaymentStore = {
      getByPayer: vi.fn().mockResolvedValue([]),
      getByReceiver: vi.fn().mockResolvedValue([]),
      getByHash: vi.fn().mockResolvedValue(mockPaymentInfo),
      save: vi.fn(),
      remove: vi.fn(),
    }
    const provider = createStoreProvider(store)

    const result = await provider.getByHash(84532, HASH)

    expect(result).toEqual(mockPaymentInfo)
    expect(store.getByHash).toHaveBeenCalledWith(84532, HASH)
  })
})

// ---------------------------------------------------------------------------
// createRecorderProvider
// ---------------------------------------------------------------------------

describe('createRecorderProvider', () => {
  it('getByPayer delegates to core with correct args', async () => {
    mockGetPayerPaymentsFromRecorder.mockResolvedValue({
      payments: [mockPaymentInfo],
      total: 1n,
    })
    const provider = createRecorderProvider(mockPublicClient, RECORDER)

    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetPayerPaymentsFromRecorder).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        recorderAddress: RECORDER,
        payer: PAYER,
        offset: 0n,
      }),
    )
  })

  it('getByReceiver delegates to core with correct args', async () => {
    mockGetReceiverPaymentsFromRecorder.mockResolvedValue({
      payments: [mockPaymentInfo],
      total: 1n,
    })
    const provider = createRecorderProvider(mockPublicClient, RECORDER)

    const result = await provider.getByReceiver(84532, RECEIVER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetReceiverPaymentsFromRecorder).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        recorderAddress: RECORDER,
        receiver: RECEIVER,
        offset: 0n,
      }),
    )
  })

  it('getByHash delegates to getRecorderPaymentInfo', async () => {
    mockGetRecorderPaymentInfo.mockResolvedValue(mockPaymentInfo)
    const provider = createRecorderProvider(mockPublicClient, RECORDER)

    const result = await provider.getByHash(84532, HASH)

    expect(result).toEqual(mockPaymentInfo)
    expect(mockGetRecorderPaymentInfo).toHaveBeenCalledWith(mockPublicClient, {
      recorderAddress: RECORDER,
      hash: HASH,
    })
  })

  it('auto-paginates when total exceeds page size', async () => {
    const info1 = { ...mockPaymentInfo, salt: 1n } as PaymentInfo
    const info2 = { ...mockPaymentInfo, salt: 2n } as PaymentInfo
    const info3 = { ...mockPaymentInfo, salt: 3n } as PaymentInfo

    mockGetPayerPaymentsFromRecorder
      .mockResolvedValueOnce({ payments: [info1, info2], total: 3n })
      .mockResolvedValueOnce({ payments: [info3], total: 3n })

    const provider = createRecorderProvider(mockPublicClient, RECORDER, 2n)
    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([info1, info2, info3])
    expect(mockGetPayerPaymentsFromRecorder).toHaveBeenCalledTimes(2)
    expect(mockGetPayerPaymentsFromRecorder).toHaveBeenNthCalledWith(
      2,
      mockPublicClient,
      expect.objectContaining({ offset: 2n, count: 2n }),
    )
  })

  it('returns empty array when total is 0', async () => {
    mockGetPayerPaymentsFromRecorder.mockResolvedValueOnce({
      payments: [],
      total: 0n,
    })
    const provider = createRecorderProvider(mockPublicClient, RECORDER)

    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([])
    expect(mockGetPayerPaymentsFromRecorder).toHaveBeenCalledTimes(1)
  })

  it('exactly page-size results — no extra page fetch', async () => {
    const info1 = { ...mockPaymentInfo, salt: 1n } as PaymentInfo
    const info2 = { ...mockPaymentInfo, salt: 2n } as PaymentInfo

    mockGetPayerPaymentsFromRecorder.mockResolvedValueOnce({
      payments: [info1, info2],
      total: 2n,
    })

    const provider = createRecorderProvider(mockPublicClient, RECORDER, 2n)
    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([info1, info2])
    expect(mockGetPayerPaymentsFromRecorder).toHaveBeenCalledTimes(1)
  })

  it('pagination stall guard — stops when page returns empty', async () => {
    mockGetPayerPaymentsFromRecorder
      .mockResolvedValueOnce({
        payments: [mockPaymentInfo],
        total: 5n,
      })
      .mockResolvedValueOnce({ payments: [], total: 5n })

    const provider = createRecorderProvider(mockPublicClient, RECORDER, 1n)
    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetPayerPaymentsFromRecorder).toHaveBeenCalledTimes(2)
  })

  it('multi-page receiver pagination', async () => {
    const info1 = { ...mockPaymentInfo, salt: 10n } as PaymentInfo
    const info2 = { ...mockPaymentInfo, salt: 20n } as PaymentInfo
    const info3 = { ...mockPaymentInfo, salt: 30n } as PaymentInfo

    mockGetReceiverPaymentsFromRecorder
      .mockResolvedValueOnce({ payments: [info1, info2], total: 3n })
      .mockResolvedValueOnce({ payments: [info3], total: 3n })

    const provider = createRecorderProvider(mockPublicClient, RECORDER, 2n)
    const result = await provider.getByReceiver(84532, RECEIVER)

    expect(result).toEqual([info1, info2, info3])
    expect(mockGetReceiverPaymentsFromRecorder).toHaveBeenCalledTimes(2)
    expect(mockGetReceiverPaymentsFromRecorder).toHaveBeenNthCalledWith(
      2,
      mockPublicClient,
      expect.objectContaining({ offset: 2n, count: 2n }),
    )
  })
})

// ---------------------------------------------------------------------------
// createEventProvider
// ---------------------------------------------------------------------------

describe('createEventProvider', () => {
  it('getByPayer delegates to core with fromBlock', async () => {
    mockGetPayerPaymentsByEvents.mockResolvedValue([mockPaymentInfo])
    const provider = createEventProvider(mockPublicClient, OPERATOR, 1000n)

    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetPayerPaymentsByEvents).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        operatorAddress: OPERATOR,
        payer: PAYER,
        fromBlock: 1000n,
      }),
    )
  })

  it('getByReceiver delegates to core with fromBlock', async () => {
    mockGetReceiverPaymentsByEvents.mockResolvedValue([mockPaymentInfo])
    const provider = createEventProvider(mockPublicClient, OPERATOR, 500n)

    const result = await provider.getByReceiver(84532, RECEIVER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetReceiverPaymentsByEvents).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        operatorAddress: OPERATOR,
        receiver: RECEIVER,
        fromBlock: 500n,
      }),
    )
  })

  it('getByHash returns null (events cannot do hash lookups)', async () => {
    const provider = createEventProvider(mockPublicClient, OPERATOR, 0n)

    const result = await provider.getByHash(84532, HASH)

    expect(result).toBeNull()
  })
})
