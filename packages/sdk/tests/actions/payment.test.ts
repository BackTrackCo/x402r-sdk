import { ValidationError } from '@x402r/core'
import { describe, expect, it, vi } from 'vitest'
import { createPaymentActions } from '../../src/actions/payment.js'
import {
  createTestConfig,
  mockPaymentInfo,
  TEST_OPERATOR,
} from '../fixtures.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@x402r/core')>()
  return {
    ...actual,
    authorize: vi.fn().mockResolvedValue('0xauthorize_hash'),
    charge: vi.fn().mockResolvedValue('0xcharge_hash'),
    release: vi.fn().mockResolvedValue('0xrelease_hash'),
    refundInEscrow: vi.fn().mockResolvedValue('0xrefund_escrow_hash'),
    refundPostEscrow: vi.fn().mockResolvedValue('0xrefund_post_hash'),
    approvePostEscrowRefund: vi.fn().mockResolvedValue('0xapprove_hash'),
    getPostEscrowRefundAllowance: vi.fn().mockResolvedValue(500000n),
    getPaymentState: vi.fn().mockResolvedValue([false, 1000000n, 0n]),
    getPaymentAmounts: vi.fn().mockResolvedValue({
      hasCollectedPayment: false,
      capturableAmount: 1000000n,
      refundableAmount: 0n,
    }),
  }
})

import {
  approvePostEscrowRefund as coreApprovePostEscrowRefund,
  authorize as coreAuthorize,
  getPostEscrowRefundAllowance as coreGetPostEscrowRefundAllowance,
  refundInEscrow as coreRefundInEscrow,
  refundPostEscrow as coreRefundPostEscrow,
  release as coreRelease,
  getPaymentAmounts,
  getPaymentState,
} from '@x402r/core'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createPaymentActions', () => {
  it('authorize calls core authorize with operatorAddress from config', async () => {
    const config = createTestConfig()
    const payment = createPaymentActions(config)

    await payment.authorize(
      mockPaymentInfo,
      1000000n,
      '0xaaaa000000000000000000000000000000000000',
      '0x',
    )

    expect(coreAuthorize).toHaveBeenCalledWith(config.walletClient, {
      operatorAddress: TEST_OPERATOR,
      paymentInfo: mockPaymentInfo,
      amount: 1000000n,
      tokenCollector: '0xaaaa000000000000000000000000000000000000',
      collectorData: '0x',
    })
  })

  it('getState works without walletClient (read-only)', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const payment = createPaymentActions(config)

    const state = await payment.getState(mockPaymentInfo)

    expect(getPaymentState).toHaveBeenCalledWith(config.publicClient, {
      operatorAddress: TEST_OPERATOR,
      chainId: 84532,
      paymentInfo: mockPaymentInfo,
    })
    expect(state).toEqual([false, 1000000n, 0n])
  })

  it('authorize throws ValidationError without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const payment = createPaymentActions(config)

    await expect(
      payment.authorize(
        mockPaymentInfo,
        1000000n,
        '0xaaaa000000000000000000000000000000000000',
        '0x',
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('release delegates correctly', async () => {
    const config = createTestConfig()
    const payment = createPaymentActions(config)

    const hash = await payment.release(mockPaymentInfo, 500000n)

    expect(coreRelease).toHaveBeenCalledWith(config.walletClient, {
      operatorAddress: TEST_OPERATOR,
      paymentInfo: mockPaymentInfo,
      amount: 500000n,
    })
    expect(hash).toBe('0xrelease_hash')
  })

  it('charge throws ValidationError without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const payment = createPaymentActions(config)

    await expect(
      payment.charge(
        mockPaymentInfo,
        1000000n,
        '0xaaaa000000000000000000000000000000000000',
        '0x',
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('getAmounts works without walletClient (read-only)', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const payment = createPaymentActions(config)

    const amounts = await payment.getAmounts(mockPaymentInfo)

    expect(getPaymentAmounts).toHaveBeenCalledWith(config.publicClient, {
      operatorAddress: TEST_OPERATOR,
      chainId: 84532,
      paymentInfo: mockPaymentInfo,
    })
    expect(amounts).toEqual({
      hasCollectedPayment: false,
      capturableAmount: 1000000n,
      refundableAmount: 0n,
    })
  })

  // ---- Refund execution ops (moved from refund action group) ---------------

  it('refundInEscrow injects operatorAddress', async () => {
    const config = createTestConfig()
    const payment = createPaymentActions(config)
    const hash = await payment.refundInEscrow(mockPaymentInfo, 50n)
    expect(coreRefundInEscrow).toHaveBeenCalledWith(config.walletClient, {
      operatorAddress: TEST_OPERATOR,
      paymentInfo: mockPaymentInfo,
      amount: 50n,
    })
    expect(hash).toBe('0xrefund_escrow_hash')
  })

  it('refundInEscrow throws ValidationError without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const payment = createPaymentActions(config)
    await expect(payment.refundInEscrow(mockPaymentInfo, 50n)).rejects.toThrow(
      ValidationError,
    )
  })

  it('refundPostEscrow passes tokenCollector and collectorData', async () => {
    const config = createTestConfig()
    const payment = createPaymentActions(config)
    const tokenCollector = '0xaaaa000000000000000000000000000000000000' as const
    const collectorData = '0xdeadbeef' as `0x${string}`

    const hash = await payment.refundPostEscrow(
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
    expect(hash).toBe('0xrefund_post_hash')
  })

  it('approvePostEscrowRefund uses receiverRefundCollector from chainConfig', async () => {
    const config = createTestConfig()
    const payment = createPaymentActions(config)
    const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const

    const hash = await payment.approvePostEscrowRefund(token, 500n)

    expect(coreApprovePostEscrowRefund).toHaveBeenCalledWith(
      config.walletClient,
      {
        token,
        collectorAddress: config.chainConfig.receiverRefundCollector,
        amount: 500n,
      },
    )
    expect(hash).toBe('0xapprove_hash')
  })

  it('getPostEscrowRefundAllowance uses receiverRefundCollector from chainConfig', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const payment = createPaymentActions(config)
    const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const
    const owner = '0x2234567890abcdef1234567890abcdef12345678' as const

    const result = await payment.getPostEscrowRefundAllowance(token, owner)

    expect(coreGetPostEscrowRefundAllowance).toHaveBeenCalledWith(
      config.publicClient,
      {
        token,
        owner,
        collectorAddress: config.chainConfig.receiverRefundCollector,
      },
    )
    expect(result).toBe(500000n)
  })

  it('payment does not expose query methods', () => {
    const config = createTestConfig()
    const payment = createPaymentActions(config)
    expect((payment as any).getPayerPayments).toBeUndefined()
    expect((payment as any).getReceiverPayments).toBeUndefined()
    expect((payment as any).getPaymentInfo).toBeUndefined()
  })
})
