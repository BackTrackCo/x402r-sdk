import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryStore } from '../../src/store/memory.js'
import {
  createTestConfig,
  mockPaymentInfo,
  TEST_RECORDER,
} from '../fixtures.js'

// ---------------------------------------------------------------------------
// Mock the providers module — avoids interfering with @x402r/core imports
// ---------------------------------------------------------------------------

const mockRecorderGetByPayer = vi.fn()
const mockRecorderGetByReceiver = vi.fn()
const mockRecorderGetByHash = vi.fn()
const mockEventGetByPayer = vi.fn()
const mockEventGetByReceiver = vi.fn()

vi.mock('../../src/resolver/providers.js', () => ({
  createStoreProvider: vi.fn(
    (store: {
      getByPayer: (...args: never) => unknown
      getByReceiver: (...args: never) => unknown
      getByHash: (...args: never) => unknown
    }) => ({
      name: 'store',
      getByPayer: (chainId: number, payer: string) =>
        store.getByPayer(chainId, payer),
      getByReceiver: (chainId: number, receiver: string) =>
        store.getByReceiver(chainId, receiver),
      getByHash: (chainId: number, hash: string) =>
        store.getByHash(chainId, hash),
    }),
  ),
  createRecorderProvider: vi.fn(() => ({
    name: 'recorder',
    getByPayer: mockRecorderGetByPayer,
    getByReceiver: mockRecorderGetByReceiver,
    getByHash: mockRecorderGetByHash,
  })),
  createEventProvider: vi.fn(() => ({
    name: 'events',
    getByPayer: mockEventGetByPayer,
    getByReceiver: mockEventGetByReceiver,
    getByHash: vi.fn().mockResolvedValue(null),
  })),
}))

import { createQueryActions } from '../../src/actions/query.js'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createQueryActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: recorder returns data, events return data
    mockRecorderGetByPayer.mockResolvedValue([mockPaymentInfo])
    mockRecorderGetByReceiver.mockResolvedValue([mockPaymentInfo])
    mockRecorderGetByHash.mockResolvedValue(mockPaymentInfo)
    mockEventGetByPayer.mockResolvedValue([mockPaymentInfo])
    mockEventGetByReceiver.mockResolvedValue([mockPaymentInfo])
  })

  it('recorder is primary source — events not called when recorder returns results', async () => {
    const config = createTestConfig({
      paymentIndexRecorderAddress: TEST_RECORDER,
    })
    const query = createQueryActions(config, TEST_RECORDER)

    const results = await query.getPayerPayments(mockPaymentInfo.payer)

    expect(results).toEqual([mockPaymentInfo])
    expect(mockRecorderGetByPayer).toHaveBeenCalled()
    expect(mockEventGetByPayer).not.toHaveBeenCalled()
  })

  it('events fallback fires when recorder returns empty', async () => {
    mockRecorderGetByPayer.mockResolvedValueOnce([])

    const config = createTestConfig({
      paymentIndexRecorderAddress: TEST_RECORDER,
    })
    const query = createQueryActions(config, TEST_RECORDER)

    const results = await query.getPayerPayments(mockPaymentInfo.payer)

    expect(results).toEqual([mockPaymentInfo])
    expect(mockRecorderGetByPayer).toHaveBeenCalled()
    expect(mockEventGetByPayer).toHaveBeenCalled()
  })

  it('events fallback fires when recorder throws', async () => {
    mockRecorderGetByReceiver.mockRejectedValueOnce(new Error('RPC error'))

    const config = createTestConfig({
      paymentIndexRecorderAddress: TEST_RECORDER,
    })
    const query = createQueryActions(config, TEST_RECORDER)

    const results = await query.getReceiverPayments(mockPaymentInfo.receiver)

    expect(results).toEqual([mockPaymentInfo])
    expect(mockEventGetByReceiver).toHaveBeenCalled()
  })

  it('store is checked first — neither recorder nor events called when store has data', async () => {
    const store = createMemoryStore()
    await store.save(84532, '0xdeadbeef', mockPaymentInfo)

    const config = createTestConfig({
      paymentIndexRecorderAddress: TEST_RECORDER,
      paymentStore: store,
    })
    const query = createQueryActions(config, TEST_RECORDER)

    const results = await query.getPayerPayments(mockPaymentInfo.payer)

    expect(results).toEqual([mockPaymentInfo])
    expect(mockRecorderGetByPayer).not.toHaveBeenCalled()
    expect(mockEventGetByPayer).not.toHaveBeenCalled()
  })

  it('getPayment by hash — recorder hit returns result', async () => {
    const config = createTestConfig({
      paymentIndexRecorderAddress: TEST_RECORDER,
    })
    const query = createQueryActions(config, TEST_RECORDER)

    const result = await query.getPayment('0xabc123')

    expect(result).toEqual(mockPaymentInfo)
    expect(mockRecorderGetByHash).toHaveBeenCalled()
  })

  it('getPayment by hash — recorder miss returns null (events cannot do hash lookups)', async () => {
    mockRecorderGetByHash.mockResolvedValueOnce(null)

    const config = createTestConfig({
      paymentIndexRecorderAddress: TEST_RECORDER,
    })
    const query = createQueryActions(config, TEST_RECORDER)

    const result = await query.getPayment('0xnonexistent')

    expect(result).toBeNull()
  })

  it('passes config correctly to provider factories', async () => {
    const { createRecorderProvider, createEventProvider } = await import(
      '../../src/resolver/providers.js'
    )

    const config = createTestConfig({
      paymentIndexRecorderAddress: TEST_RECORDER,
    })
    createQueryActions(config, TEST_RECORDER)

    expect(createRecorderProvider).toHaveBeenCalledWith(
      config.publicClient,
      TEST_RECORDER,
    )
    expect(createEventProvider).toHaveBeenCalledWith(
      config.publicClient,
      config.operatorAddress,
    )
  })
})
