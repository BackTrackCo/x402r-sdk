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
    approveRefundWithSignature: vi.fn().mockResolvedValue('0xhash'),
    getRefundRequest: vi.fn().mockResolvedValue({
      paymentInfoHash: '0x0',
      nonce: 0n,
      amount: 0n,
      status: 0,
    }),
    getRefundRequestByKey: vi.fn().mockResolvedValue({
      paymentInfoHash: '0x0',
      nonce: 0n,
      amount: 0n,
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
    approveRefundBudget: vi.fn().mockResolvedValue('0xhash'),
    getRefundBudget: vi.fn().mockResolvedValue(0n),
    refundInEscrow: vi.fn().mockResolvedValue('0xhash'),
    refundPostEscrow: vi.fn().mockResolvedValue('0xhash'),
  }
})

import {
  approveRefundBudget,
  approveRefundWithSignature,
  cancelRefundRequest,
  refundInEscrow as coreRefundInEscrow,
  refundPostEscrow as coreRefundPostEscrow,
  denyRefundRequest,
  getCancelCount,
  getCancelledAmount,
  getOperatorRefundRequests,
  getPayerRefundRequests,
  getReceiverRefundRequests,
  getRefundBudget,
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

  // ---- Existing tests (fixed assertions) ------------------------------------

  it('request injects refundRequestAddress as contractAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    await actions.request(mockPaymentInfo, 100n, 1n)
    expect(requestRefund).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      amount: 100n,
      nonce: 1n,
    })
  })

  it('refundInEscrow injects operatorAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    await actions.refundInEscrow(mockPaymentInfo, 50n)
    expect(coreRefundInEscrow).toHaveBeenCalledWith(config.walletClient, {
      operatorAddress: TEST_OPERATOR,
      paymentInfo: mockPaymentInfo,
      amount: 50n,
    })
  })

  it('write method throws ValidationError without walletClient', () => {
    const actions = createRefundActions(
      createTestConfig({ walletClient: undefined }),
    )
    expect(() => actions.request(mockPaymentInfo, 100n, 1n)).toThrow(
      ValidationError,
    )
  })

  it('read method works without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
    await actions.get(mockPaymentInfo, 1n)
    expect(getRefundRequest).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 1n,
    })
  })

  // ---- New tests (coverage + correctness) -----------------------------------

  it('getBudget reads from operatorAddress', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
    const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
    const owner = '0x2234567890abcdef1234567890abcdef12345678' as const

    const result = await actions.getBudget(token, owner)

    expect(getRefundBudget).toHaveBeenCalledWith(config.publicClient, {
      token,
      owner,
      operatorAddress: TEST_OPERATOR,
    })
    expect(result).toBe(0n)
  })

  it('approveBudget writes with walletClient and operatorAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const

    const hash = await actions.approveBudget(token, 500n)

    expect(approveRefundBudget).toHaveBeenCalledWith(config.walletClient, {
      token,
      operatorAddress: TEST_OPERATOR,
      amount: 500n,
    })
    expect(hash).toBe('0xhash')
  })

  it('approveWithSignature delegates all 5 args correctly', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    const signature = '0xsig' as `0x${string}`

    await actions.approveWithSignature(
      mockPaymentInfo,
      1n,
      200n,
      1700000000,
      signature,
    )

    expect(approveRefundWithSignature).toHaveBeenCalledWith(
      config.walletClient,
      {
        contractAddress: TEST_REFUND_REQUEST,
        paymentInfo: mockPaymentInfo,
        nonce: 1n,
        amount: 200n,
        expiry: 1700000000,
        signature,
      },
    )
  })

  it('cancel delegates with refundRequestAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    await actions.cancel(mockPaymentInfo, 1n)
    expect(cancelRefundRequest).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 1n,
    })
  })

  it('deny delegates with refundRequestAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    await actions.deny(mockPaymentInfo, 2n)
    expect(denyRefundRequest).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 2n,
    })
  })

  it('refuse delegates with refundRequestAddress', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    await actions.refuse(mockPaymentInfo, 3n)
    expect(refuseRefundRequest).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 3n,
    })
  })

  it('getByKey delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
    const key = '0xabcd' as `0x${string}`
    await actions.getByKey(key)
    expect(getRefundRequestByKey).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      compositeKey: key,
    })
  })

  it('getStatus delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
    const result = await actions.getStatus(mockPaymentInfo, 1n)
    expect(getRefundRequestStatus).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 1n,
    })
    expect(result).toBe(0)
  })

  it('has delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
    const result = await actions.has(mockPaymentInfo, 1n)
    expect(hasRefundRequest).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 1n,
    })
    expect(result).toBe(true)
  })

  it('getStoredPaymentInfo delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
    const hash = '0x1234' as `0x${string}`
    await actions.getStoredPaymentInfo(hash)
    expect(getStoredPaymentInfo).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfoHash: hash,
    })
  })

  it('getPayerRequests delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
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
    const actions = createRefundActions(config)
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
    const actions = createRefundActions(config)
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
    const actions = createRefundActions(config)
    const result = await actions.getCancelCount(mockPaymentInfo, 1n)
    expect(getCancelCount).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 1n,
    })
    expect(result).toBe(0n)
  })

  it('getCancelledAmount delegates correctly', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createRefundActions(config)
    const result = await actions.getCancelledAmount(mockPaymentInfo, 1n, 0n)
    expect(getCancelledAmount).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_REFUND_REQUEST,
      paymentInfo: mockPaymentInfo,
      nonce: 1n,
      cancelIndex: 0n,
    })
    expect(result).toBe(0n)
  })

  it('refundPostEscrow passes tokenCollector and collectorData', async () => {
    const config = createTestConfig()
    const actions = createRefundActions(config)
    const tokenCollector = '0xaaaa000000000000000000000000000000000000' as const
    const collectorData = '0xdeadbeef' as `0x${string}`

    const hash = await actions.refundPostEscrow(
      mockPaymentInfo,
      300n,
      tokenCollector,
      collectorData,
    )

    expect(coreRefundPostEscrow).toHaveBeenCalledWith(config.walletClient, {
      operatorAddress: TEST_OPERATOR,
      paymentInfo: mockPaymentInfo,
      amount: 300n,
      tokenCollector,
      collectorData,
    })
    expect(hash).toBe('0xhash')
  })
})
