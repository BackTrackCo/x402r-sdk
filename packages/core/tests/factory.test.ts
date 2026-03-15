import { describe, expect, it } from 'vitest'
import { getDeployerOperator } from '../src/actions/factory/getDeployerOperator.js'
import { getDeployerOperatorCount } from '../src/actions/factory/getDeployerOperatorCount.js'
import { getDeployerOperators } from '../src/actions/factory/getDeployerOperators.js'
import { createMockPublicClient, TEST_ADDRESSES } from './fixtures.js'

const FACTORY_ADDRESS = '0xcafecafecafecafecafecafecafecafecafecafe' as const
const OPERATOR_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const
const OPERATOR_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const

describe('getDeployerOperatorCount', () => {
  it('passes correct args and returns bigint', async () => {
    const client = createMockPublicClient({
      deployerOperatorCount: 3n,
    })

    const result = await getDeployerOperatorCount(client, {
      factoryAddress: FACTORY_ADDRESS,
      deployer: TEST_ADDRESSES.payer,
    })

    expect(result).toBe(3n)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: FACTORY_ADDRESS,
        functionName: 'deployerOperatorCount',
        args: [TEST_ADDRESSES.payer],
      }),
    )
  })
})

describe('getDeployerOperator', () => {
  it('passes correct args and returns address', async () => {
    const client = createMockPublicClient({
      getDeployerOperator: OPERATOR_A,
    })

    const result = await getDeployerOperator(client, {
      factoryAddress: FACTORY_ADDRESS,
      deployer: TEST_ADDRESSES.payer,
      index: 0n,
    })

    expect(result).toBe(OPERATOR_A)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: FACTORY_ADDRESS,
        functionName: 'getDeployerOperator',
        args: [TEST_ADDRESSES.payer, 0n],
      }),
    )
  })
})

describe('getDeployerOperators', () => {
  it('passes correct args and returns { operators, total }', async () => {
    const client = createMockPublicClient({
      getDeployerOperators: [[OPERATOR_A, OPERATOR_B], 2n],
    })

    const result = await getDeployerOperators(client, {
      factoryAddress: FACTORY_ADDRESS,
      deployer: TEST_ADDRESSES.payer,
      offset: 0n,
      count: 100n,
    })

    expect(result.operators).toEqual([OPERATOR_A, OPERATOR_B])
    expect(result.total).toBe(2n)
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: FACTORY_ADDRESS,
        functionName: 'getDeployerOperators',
        args: [TEST_ADDRESSES.payer, 0n, 100n],
      }),
    )
  })
})
