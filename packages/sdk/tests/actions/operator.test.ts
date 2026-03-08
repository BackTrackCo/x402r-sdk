import { ValidationError } from '@x402r/core'
import { zeroAddress } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { createOperatorActions } from '../../src/actions/operator.js'
import { account, createTestConfig, mockPaymentInfo } from '../fixtures.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@x402r/core')>()
  return {
    ...actual,
    getOperatorConfig: vi.fn().mockResolvedValue({}),
    getFeeAddresses: vi.fn().mockResolvedValue({}),
    calculateTotalFees: vi.fn().mockResolvedValue({
      protocolFeeBps: 100n,
      operatorFeeBps: 200n,
      totalFeeBps: 300n,
      protocolFeeAmount: 10n,
      operatorFeeAmount: 20n,
      totalFeeAmount: 30n,
      netAmount: 970n,
    }),
    calculateOperatorFeeBps: vi.fn().mockResolvedValue(200n),
    calculateProtocolFeeBps: vi.fn().mockResolvedValue(100n),
    getAuthorizedFees: vi
      .fn()
      .mockResolvedValue({ totalFeeBps: 300, protocolFeeBps: 100 }),
    getAccumulatedProtocolFees: vi.fn().mockResolvedValue(5000n),
    distributeFees: vi.fn().mockResolvedValue('0xdistribute_hash'),
  }
})

import { calculateTotalFees } from '@x402r/core'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createOperatorActions', () => {
  it('calculateFees passes caller from walletClient.account.address', async () => {
    const config = createTestConfig()
    const operator = createOperatorActions(config)

    await operator.calculateFees(mockPaymentInfo, 1000n)

    expect(calculateTotalFees).toHaveBeenCalledWith(config.publicClient, {
      operatorAddress: config.operatorAddress,
      paymentInfo: mockPaymentInfo,
      amount: 1000n,
      caller: account.address,
    })
  })

  it('calculateFees passes zeroAddress when no walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const operator = createOperatorActions(config)

    await operator.calculateFees(mockPaymentInfo, 1000n)

    expect(calculateTotalFees).toHaveBeenCalledWith(config.publicClient, {
      operatorAddress: config.operatorAddress,
      paymentInfo: mockPaymentInfo,
      amount: 1000n,
      caller: zeroAddress,
    })
  })

  it('getConfig works without walletClient (read-only)', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const operator = createOperatorActions(config)

    await expect(operator.getConfig()).resolves.not.toThrow()
  })

  it('getFeeAddresses works without walletClient (read-only)', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const operator = createOperatorActions(config)

    await expect(operator.getFeeAddresses()).resolves.not.toThrow()
  })

  it('distributeFees throws ValidationError without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const operator = createOperatorActions(config)

    await expect(
      operator.distributeFees('0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
    ).rejects.toThrow(ValidationError)
  })
})
