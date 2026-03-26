import { ValidationError } from '@x402r/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRefundActions } from '../../src/actions/refund.js'
import {
  createTestConfig,
  mockPaymentInfo,
  TEST_OPERATOR,
  TEST_REFUND_REQUEST,
} from '../fixtures.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@x402r/core')>()
  return {
    ...actual,
    requestRefund: vi.fn().mockResolvedValue('0xhash'),
    cancelRefundRequest: vi.fn().mockResolvedValue('0xhash'),
    denyRefundRequest: vi.fn().mockResolvedValue('0xhash'),
    refuseRefundRequest: vi.fn().mockResolvedValue('0xhash'),
    getRefundRequest: vi.fn().mockResolvedValue({
      paymentInfoHash: '0x0',
      amount: 0n,
      approvedAmount: 0n,
      status: 0,
    }),
    getRefundRequestByKey: vi.fn().mockResolvedValue({
      paymentInfoHash: '0x0',
      amount: 0n,
      approvedAmount: 0n,
      status: 0,
    }),
    getRefundRequestStatus: vi.fn().mockResolvedValue(0),
    hasRefundRequest: vi.fn().mockResolvedValue(true),
    getStoredPaymentInfo: vi.fn().mockResolvedValue({}),
    getPayerRefundRequests: vi.fn().mockResolvedValue({ keys: [], total: 0n }),
    getReceiverRefundRequests: vi
      .fn()
      .mockResolvedValue({ keys: [], total: 0n }),
    getOperatorRefundRequests: vi
      .fn()
      .mockResolvedValue({ keys: [], total: 0n }),
    getCancelCount: vi.fn().mockResolvedValue(0n),
    getCancelledAmount: vi.fn().mockResolvedValue(0n),
  }
})

import {
  cancelRefundRequest,
  denyRefundRequest,
  getCancelCount,
  getCancelledAmount,
  getOperatorRefundRequests,
  getPayerRefundRequests,
  getReceiverRefundRequests,
  getRefundRequest,
  getRefundRequestByKey,
  getRefundRequestStatus,
  getStoredPaymentInfo,
  hasRefundRequest,
  refuseRefundRequest,
  requestRefund,
} from '@x402r/core'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRefundActions', () => {
  beforeEach(() => vi.clearAllMocks())

  // ---- Dispute write ops ---------------------------------------------------

  it('request injects refundRequestAddress as contractAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config, config.refundRequestAddress!)
    await actions.request(mockPaymentInfo, 100n)
    expect(requestRefund).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      amount: 100n,
    })
  })

  it('write method throws ValidationError without walletClient', () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    expect(() => actions.request(mockPaymentInfo, 100n)).toThrow(
      ValidationError,
    )
  })

  it('read method works without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    await actions.get(mockPaymentInfo)
    expect(getRefundRequest).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
    })
  })

  it('cancel delegates with refundRequestAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config, config.refundRequestAddress!)
    await actions.cancel(mockPaymentInfo)
    expect(cancelRefundRequest).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
    })
  })

  it('deny delegates with refundRequestAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config, config.refundRequestAddress!)
    await actions.deny(mockPaymentInfo)
    expect(denyRefundRequest).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
    })
  })

  it('refuse delegates with refundRequestAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config, config.refundRequestAddress!)
    await actions.refuse(mockPaymentInfo)
    expect(refuseRefundRequest).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
    })
  })

  // ---- Dispute read ops ----------------------------------------------------

  it('getByKey delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const key = '0xabcd' as `0x${string}`
    await actions.getByKey(key)
    expect(getRefundRequestByKey).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfoHash: key,
    })
  })

  it('getStatus delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const result = await actions.getStatus(mockPaymentInfo)
    expect(getRefundRequestStatus).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
    })
    expect(result).toBe(0)
  })

  it('has delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const result = await actions.has(mockPaymentInfo)
    expect(hasRefundRequest).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
    })
    expect(result).toBe(true)
  })

  it('getStoredPaymentInfo delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const hash = '0x1234' as `0x${string}`
    await actions.getStoredPaymentInfo(hash)
    expect(getStoredPaymentInfo).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfoHash: hash,
    })
  })

  it('getPayerRequests delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const payer = '0x2234567890abcdef1234567890abcdef12345678' as const
    const result = await actions.getPayerRequests(payer, 0n, 10n)
    expect(getPayerRefundRequests).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      payer,
      offset: 0n,
      count: 10n,
    })
    expect(result).toEqual({ keys: [], total: 0n })
  })

  it('getReceiverRequests delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const receiver = '0x3234567890abcdef1234567890abcdef12345678' as const
    await actions.getReceiverRequests(receiver, 0n, 5n)
    expect(getReceiverRefundRequests).toHaveBeenCalledWith(
      config.publicClient,
      {
        contractAddress: TEST_REFUND_REQUEST,
        receiver,
        offset: 0n,
        count: 5n,
      },
    )
  })

  it('getOperatorRequests delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    await actions.getOperatorRequests(TEST_OPERATOR, 0n, 5n)
    expect(getOperatorRefundRequests).toHaveBeenCalledWith(
      config.publicClient,
      {
        contractAddress: TEST_REFUND_REQUEST,
        operator: TEST_OPERATOR,
        offset: 0n,
        count: 5n,
      },
    )
  })

  it('getCancelCount delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const result = await actions.getCancelCount(mockPaymentInfo)
    expect(getCancelCount).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
    })
    expect(result).toBe(0n)
  })

  it('getCancelledAmount delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config, config.refundRequestAddress!)
    const result = await actions.getCancelledAmount(mockPaymentInfo, 0n)
    expect(getCancelledAmount).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      cancelIndex: 0n,
    })
    expect(result).toBe(0n)
  })
})
