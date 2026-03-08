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
    getPaymentState: vi.fn().mockResolvedValue([false, 1000000n, 0n]),
    getPaymentAmounts: vi.fn().mockResolvedValue({
      hasCollectedPayment: false,
      capturableAmount: 1000000n,
      refundableAmount: 0n,
    }),
  }
})

import {
  authorize as coreAuthorize,
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
})
