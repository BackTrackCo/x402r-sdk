import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPaymentInfo } from './fixtures.js'

const mockGetPayerPaymentsFromHook = vi.fn()
const mockGetReceiverPaymentsFromHook = vi.fn()
const mockGetHookPaymentInfo = vi.fn()
const mockGetPayerPaymentsByEvents = vi.fn()
const mockGetReceiverPaymentsByEvents = vi.fn()

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getPayerPaymentsFromHook: (...args: unknown[]) =>
      mockGetPayerPaymentsFromHook(...args),
    getReceiverPaymentsFromHook: (...args: unknown[]) =>
      mockGetReceiverPaymentsFromHook(...args),
    getHookPaymentInfo: (...args: unknown[]) => mockGetHookPaymentInfo(...args),
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
  createHookProvider,
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
// createHookProvider
// ---------------------------------------------------------------------------

describe('createHookProvider', () => {
  it('getByPayer delegates to core with correct args', async () => {
    mockGetPayerPaymentsFromHook.mockResolvedValue({
      payments: [mockPaymentInfo],
      total: 1n,
    })
    const provider = createHookProvider(mockPublicClient, RECORDER)

    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetPayerPaymentsFromHook).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        hookAddress: RECORDER,
        payer: PAYER,
        offset: 0n,
      }),
    )
  })

  it('getByReceiver delegates to core with correct args', async () => {
    mockGetReceiverPaymentsFromHook.mockResolvedValue({
      payments: [mockPaymentInfo],
      total: 1n,
    })
    const provider = createHookProvider(mockPublicClient, RECORDER)

    const result = await provider.getByReceiver(84532, RECEIVER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetReceiverPaymentsFromHook).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        hookAddress: RECORDER,
        receiver: RECEIVER,
        offset: 0n,
      }),
    )
  })

  it('getByHash delegates to getHookPaymentInfo', async () => {
    mockGetHookPaymentInfo.mockResolvedValue(mockPaymentInfo)
    const provider = createHookProvider(mockPublicClient, RECORDER)

    const result = await provider.getByHash(84532, HASH)

    expect(result).toEqual(mockPaymentInfo)
    expect(mockGetHookPaymentInfo).toHaveBeenCalledWith(mockPublicClient, {
      hookAddress: RECORDER,
      hash: HASH,
    })
  })

  it('auto-paginates when total exceeds page size', async () => {
    const info1 = { ...mockPaymentInfo, salt: 1n } as PaymentInfo
    const info2 = { ...mockPaymentInfo, salt: 2n } as PaymentInfo
    const info3 = { ...mockPaymentInfo, salt: 3n } as PaymentInfo

    mockGetPayerPaymentsFromHook
      .mockResolvedValueOnce({ payments: [info1, info2], total: 3n })
      .mockResolvedValueOnce({ payments: [info3], total: 3n })

    const provider = createHookProvider(mockPublicClient, RECORDER, 2n)
    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([info1, info2, info3])
    expect(mockGetPayerPaymentsFromHook).toHaveBeenCalledTimes(2)
    expect(mockGetPayerPaymentsFromHook).toHaveBeenNthCalledWith(
      2,
      mockPublicClient,
      expect.objectContaining({ offset: 2n, count: 2n }),
    )
  })

  it('returns empty array when total is 0', async () => {
    mockGetPayerPaymentsFromHook.mockResolvedValueOnce({
      payments: [],
      total: 0n,
    })
    const provider = createHookProvider(mockPublicClient, RECORDER)

    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([])
    expect(mockGetPayerPaymentsFromHook).toHaveBeenCalledTimes(1)
  })

  it('exactly page-size results — no extra page fetch', async () => {
    const info1 = { ...mockPaymentInfo, salt: 1n } as PaymentInfo
    const info2 = { ...mockPaymentInfo, salt: 2n } as PaymentInfo

    mockGetPayerPaymentsFromHook.mockResolvedValueOnce({
      payments: [info1, info2],
      total: 2n,
    })

    const provider = createHookProvider(mockPublicClient, RECORDER, 2n)
    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([info1, info2])
    expect(mockGetPayerPaymentsFromHook).toHaveBeenCalledTimes(1)
  })

  it('pagination stall guard — stops when page returns empty', async () => {
    mockGetPayerPaymentsFromHook
      .mockResolvedValueOnce({
        payments: [mockPaymentInfo],
        total: 5n,
      })
      .mockResolvedValueOnce({ payments: [], total: 5n })

    const provider = createHookProvider(mockPublicClient, RECORDER, 1n)
    const result = await provider.getByPayer(84532, PAYER)

    expect(result).toEqual([mockPaymentInfo])
    expect(mockGetPayerPaymentsFromHook).toHaveBeenCalledTimes(2)
  })

  it('multi-page receiver pagination', async () => {
    const info1 = { ...mockPaymentInfo, salt: 10n } as PaymentInfo
    const info2 = { ...mockPaymentInfo, salt: 20n } as PaymentInfo
    const info3 = { ...mockPaymentInfo, salt: 30n } as PaymentInfo

    mockGetReceiverPaymentsFromHook
      .mockResolvedValueOnce({ payments: [info1, info2], total: 3n })
      .mockResolvedValueOnce({ payments: [info3], total: 3n })

    const provider = createHookProvider(mockPublicClient, RECORDER, 2n)
    const result = await provider.getByReceiver(84532, RECEIVER)

    expect(result).toEqual([info1, info2, info3])
    expect(mockGetReceiverPaymentsFromHook).toHaveBeenCalledTimes(2)
    expect(mockGetReceiverPaymentsFromHook).toHaveBeenNthCalledWith(
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
