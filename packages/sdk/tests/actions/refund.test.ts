import { ValidationError } from '@x402r/core'
import { describe, expect, it, vi } from 'vitest'
import { createRefundActions } from '../../src/actions/refund.js'
import {
  createTestConfig,
  mockPaymentInfo,
  TEST_OPERATOR,
  TEST_REFUND_REQUEST,
} from '../fixtures.js'

// Mock all core refund functions
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

describe('createRefundActions', () => {
  it('request injects refundRequestAddress as contractAddress', async () => {
    const { requestRefund } = await import('@x402r/core')
    const actions = createRefundActions(createTestConfig())
    await actions.request(mockPaymentInfo, 100n, 1n)
    expect(requestRefund).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contractAddress: TEST_REFUND_REQUEST,
        paymentInfo: mockPaymentInfo,
        amount: 100n,
        nonce: 1n,
      }),
    )
  })

  it('refundInEscrow injects operatorAddress', async () => {
    const { refundInEscrow } = await import('@x402r/core')
    const actions = createRefundActions(createTestConfig())
    await actions.refundInEscrow(mockPaymentInfo, 50n)
    expect(refundInEscrow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        operatorAddress: TEST_OPERATOR,
        paymentInfo: mockPaymentInfo,
        amount: 50n,
      }),
    )
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
    const actions = createRefundActions(
      createTestConfig({ walletClient: undefined }),
    )
    const result = await actions.get(mockPaymentInfo, 1n)
    expect(result).toBeDefined()
  })
})
