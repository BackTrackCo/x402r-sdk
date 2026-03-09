import { describe, expect, it, vi } from 'vitest'
import { createEscrowActions } from '../../src/actions/escrow.js'
import {
  createTestConfig,
  mockPaymentInfo,
  TEST_ESCROW_PERIOD,
} from '../fixtures.js'

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@x402r/core')>()
  return {
    ...actual,
    isDuringEscrowPeriod: vi.fn().mockResolvedValue(true),
    getAuthorizationTime: vi.fn().mockResolvedValue(1700000000n),
    getEscrowPeriodDuration: vi.fn().mockResolvedValue(86400n),
  }
})

describe('createEscrowActions', () => {
  it('isDuringEscrow delegates to core with escrowPeriodAddress', async () => {
    const { isDuringEscrowPeriod } = await import('@x402r/core')
    const config = createTestConfig({ escrowPeriodAddress: TEST_ESCROW_PERIOD })
    const actions = createEscrowActions(config)

    const result = await actions.isDuringEscrow(mockPaymentInfo)

    expect(result).toBe(true)
    expect(isDuringEscrowPeriod).toHaveBeenCalledWith(config.publicClient, {
      escrowPeriodAddress: TEST_ESCROW_PERIOD,
      paymentInfo: mockPaymentInfo,
    })
  })

  it('getAuthorizationTime delegates to core with escrowPeriodAddress', async () => {
    const { getAuthorizationTime } = await import('@x402r/core')
    const config = createTestConfig({ escrowPeriodAddress: TEST_ESCROW_PERIOD })
    const actions = createEscrowActions(config)

    const result = await actions.getAuthorizationTime(mockPaymentInfo)

    expect(result).toBe(1700000000n)
    expect(getAuthorizationTime).toHaveBeenCalledWith(config.publicClient, {
      escrowPeriodAddress: TEST_ESCROW_PERIOD,
      paymentInfo: mockPaymentInfo,
    })
  })

  it('getDuration delegates to core with escrowPeriodAddress', async () => {
    const { getEscrowPeriodDuration } = await import('@x402r/core')
    const config = createTestConfig({ escrowPeriodAddress: TEST_ESCROW_PERIOD })
    const actions = createEscrowActions(config)

    const result = await actions.getDuration()

    expect(result).toBe(86400n)
    expect(getEscrowPeriodDuration).toHaveBeenCalledWith(config.publicClient, {
      escrowPeriodAddress: TEST_ESCROW_PERIOD,
    })
  })
})
