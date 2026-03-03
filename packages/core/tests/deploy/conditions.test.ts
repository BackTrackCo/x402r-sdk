import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'
import type {
  ConditionSingletonAddresses,
  FactoryAddresses,
} from '../../src/config/index.js'
import {
  createConditionHelpers,
  resolveCondition,
} from '../../src/deploy/conditions.js'
import { createMockPublicClient, createMockWalletClient } from '../fixtures.js'

const SINGLETONS: ConditionSingletonAddresses = {
  payer: '0x1111111111111111111111111111111111111111',
  receiver: '0x2222222222222222222222222222222222222222',
  alwaysTrue: '0x3333333333333333333333333333333333333333',
}

const FACTORY_ADDRESSES: FactoryAddresses = {
  paymentOperator: '0xF000000000000000000000000000000000000001',
  escrowPeriod: '0xF000000000000000000000000000000000000002',
  freeze: '0xF000000000000000000000000000000000000003',
  staticFeeCalculator: '0xF000000000000000000000000000000000000004',
  staticAddressCondition: '0xF000000000000000000000000000000000000005',
  andCondition: '0xF000000000000000000000000000000000000006',
  orCondition: '0xF000000000000000000000000000000000000007',
  notCondition: '0xF000000000000000000000000000000000000008',
  recorderCombinator: '0xF000000000000000000000000000000000000009',
}

describe('createConditionHelpers', () => {
  it('exposes singletons and builds correct condition types', () => {
    const c = createConditionHelpers(SINGLETONS)

    expect(c.PAYER).toBe(SINGLETONS.payer)
    expect(c.RECEIVER).toBe(SINGLETONS.receiver)
    expect(c.ALWAYS_TRUE).toBe(SINGLETONS.alwaysTrue)

    const andCond = c.and(c.PAYER, c.RECEIVER)
    expect(andCond.type).toBe('and')
    expect(andCond.conditions).toEqual([SINGLETONS.payer, SINGLETONS.receiver])

    const orCond = c.or(c.PAYER, c.RECEIVER)
    expect(orCond.type).toBe('or')

    const notCond = c.not(c.PAYER)
    expect(notCond.type).toBe('not')
    expect(notCond.condition).toBe(SINGLETONS.payer)

    const staticCond = c.staticAddress(
      '0x4444444444444444444444444444444444444444',
    )
    expect(staticCond.type).toBe('staticAddress')
    expect(staticCond.designatedAddress).toBe(
      '0x4444444444444444444444444444444444444444',
    )
  })
})

describe('resolveCondition', () => {
  it('passes through Address string without deploying', async () => {
    const addr = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as Address
    const publicClient = createMockPublicClient()
    const walletClient = createMockWalletClient()

    const result = await resolveCondition(
      walletClient,
      publicClient,
      FACTORY_ADDRESSES,
      addr,
    )

    expect(result.address).toBe(addr)
    expect(result.deployments).toEqual([])
    expect(walletClient.writeContract).not.toHaveBeenCalled()
  })

  it('resolves nested AND(staticAddress, OR(addr, addr)) with correct deployment count', async () => {
    const staticAddr = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' as Address
    const orAddr = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as Address
    const andAddr = '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD' as Address

    // Mock: all getDeployed return zeroAddress (nothing exists yet)
    // computeAddress returns predictable addresses based on factory
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      [`${FACTORY_ADDRESSES.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${FACTORY_ADDRESSES.staticAddressCondition}:computeAddress`]:
        staticAddr,
      [`${FACTORY_ADDRESSES.orCondition}:getDeployed`]: zeroAddress,
      [`${FACTORY_ADDRESSES.orCondition}:computeAddress`]: orAddr,
      [`${FACTORY_ADDRESSES.andCondition}:getDeployed`]: zeroAddress,
      [`${FACTORY_ADDRESSES.andCondition}:computeAddress`]: andAddr,
    })
    const walletClient = createMockWalletClient()

    const c = createConditionHelpers(SINGLETONS)
    const tree = c.and(
      c.staticAddress('0x5555555555555555555555555555555555555555'),
      c.or(SINGLETONS.payer, SINGLETONS.receiver),
    )

    const result = await resolveCondition(
      walletClient,
      publicClient,
      FACTORY_ADDRESSES,
      tree,
    )

    // staticAddress(1) + or(1) + and(1) = 3 deployments
    expect(result.deployments).toHaveLength(3)
    expect(result.address).toBe(andAddr)
    // First deployment is staticAddress, second is or, third is and
    expect(result.deployments[0].address).toBe(staticAddr)
    expect(result.deployments[1].address).toBe(orAddr)
    expect(result.deployments[2].address).toBe(andAddr)
  })

  it('throws on unknown condition type', async () => {
    const publicClient = createMockPublicClient()
    const walletClient = createMockWalletClient()

    const badInput = { type: 'xor', conditions: [] } as any

    await expect(
      resolveCondition(walletClient, publicClient, FACTORY_ADDRESSES, badInput),
    ).rejects.toThrow('Unknown condition type')
  })
})
