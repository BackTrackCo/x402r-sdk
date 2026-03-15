import { describe, expect, it, vi } from 'vitest'
import { createTestConfig } from '../fixtures.js'

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getDeployerOperatorCount: vi.fn().mockResolvedValue(5n),
    getDeployerOperator: vi
      .fn()
      .mockResolvedValue('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const),
    getDeployerOperators: vi.fn().mockResolvedValue({
      operators: [
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      ],
      total: 2n,
    }),
  }
})

import {
  getDeployerOperator,
  getDeployerOperatorCount,
  getDeployerOperators,
} from '@x402r/core'
import { createFactoryActions } from '../../src/actions/factory.js'

const DEPLOYER = '0x2234567890abcdef1234567890abcdef12345678' as const

describe('createFactoryActions', () => {
  it('getDeployerOperatorCount delegates to core with factory address', async () => {
    const config = createTestConfig()
    const factory = createFactoryActions(config)

    const result = await factory.getDeployerOperatorCount(DEPLOYER)

    expect(result).toBe(5n)
    expect(getDeployerOperatorCount).toHaveBeenCalledWith(
      config.publicClient,
      expect.objectContaining({
        factoryAddress: config.chainConfig.factories.paymentOperator,
        deployer: DEPLOYER,
      }),
    )
  })

  it('getDeployerOperator delegates to core with factory address', async () => {
    const config = createTestConfig()
    const factory = createFactoryActions(config)

    const result = await factory.getDeployerOperator(DEPLOYER, 0n)

    expect(result).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    expect(getDeployerOperator).toHaveBeenCalledWith(
      config.publicClient,
      expect.objectContaining({
        factoryAddress: config.chainConfig.factories.paymentOperator,
        deployer: DEPLOYER,
        index: 0n,
      }),
    )
  })

  it('getDeployerOperators delegates to core with factory address', async () => {
    const config = createTestConfig()
    const factory = createFactoryActions(config)

    const result = await factory.getDeployerOperators(DEPLOYER, 0n, 100n)

    expect(result.operators).toEqual([
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ])
    expect(result.total).toBe(2n)
    expect(getDeployerOperators).toHaveBeenCalledWith(
      config.publicClient,
      expect.objectContaining({
        factoryAddress: config.chainConfig.factories.paymentOperator,
        deployer: DEPLOYER,
        offset: 0n,
        count: 100n,
      }),
    )
  })
})
