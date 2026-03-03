import { zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'
import {
  computeViaFactory,
  deployViaFactory,
} from '../../src/deploy/factory-helpers.js'
import { ContractCallError } from '../../src/errors/index.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockWalletWithoutAccount,
  MOCK_TX_HASH,
} from '../fixtures.js'

const FACTORY_ADDRESS = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const
const DEPLOYED_ADDRESS = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' as const

const testAbi = [
  {
    type: 'function',
    name: 'deploy',
    inputs: [{ name: 'feeBps', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: 'feeBps', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [{ name: 'feeBps', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deployOperator',
    inputs: [{ name: 'config', type: 'bytes' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getOperator',
    inputs: [{ name: 'config', type: 'bytes' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const

describe('computeViaFactory', () => {
  it('delegates to readContract with correct functionName', async () => {
    const publicClient = createMockPublicClient({
      computeAddress: DEPLOYED_ADDRESS,
    })

    const result = await computeViaFactory(publicClient, {
      factoryAddress: FACTORY_ADDRESS,
      abi: testAbi,
      args: [50n],
    })

    expect(result).toBe(DEPLOYED_ADDRESS)
    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: FACTORY_ADDRESS,
        functionName: 'computeAddress',
        args: [50n],
      }),
    )
  })
})

describe('deployViaFactory', () => {
  it('returns existing { isNew: false } when getDeployed returns non-zero address', async () => {
    const publicClient = createMockPublicClient({
      getDeployed: DEPLOYED_ADDRESS,
    })
    const walletClient = createMockWalletClient()

    const result = await deployViaFactory(walletClient, publicClient, {
      factoryAddress: FACTORY_ADDRESS,
      abi: testAbi,
      args: [50n],
      opName: 'deployFeeCalculator',
    })

    expect(result).toEqual({
      address: DEPLOYED_ADDRESS,
      hash: null,
      isNew: false,
    })
    // writeContract should NOT be called
    expect(walletClient.writeContract).not.toHaveBeenCalled()
  })

  it('deploys and returns { isNew: true } when getDeployed returns zero', async () => {
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      computeAddress: DEPLOYED_ADDRESS,
    })
    const walletClient = createMockWalletClient()

    const result = await deployViaFactory(walletClient, publicClient, {
      factoryAddress: FACTORY_ADDRESS,
      abi: testAbi,
      args: [50n],
      opName: 'deployFeeCalculator',
    })

    expect(result).toEqual({
      address: DEPLOYED_ADDRESS,
      hash: MOCK_TX_HASH,
      isNew: true,
    })
    expect(walletClient.writeContract).toHaveBeenCalled()
    expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: MOCK_TX_HASH,
    })
  })

  it('throws ContractCallError without wallet account', async () => {
    const publicClient = createMockPublicClient()
    const walletClient = createMockWalletWithoutAccount()

    await expect(
      deployViaFactory(walletClient, publicClient, {
        factoryAddress: FACTORY_ADDRESS,
        abi: testAbi,
        args: [50n],
        opName: 'deployFeeCalculator',
      }),
    ).rejects.toThrow(ContractCallError)
  })

  it('uses custom function names when overridden', async () => {
    const publicClient = createMockPublicClient({
      getOperator: zeroAddress,
      computeAddress: DEPLOYED_ADDRESS,
    })
    const walletClient = createMockWalletClient()

    const result = await deployViaFactory(walletClient, publicClient, {
      factoryAddress: FACTORY_ADDRESS,
      abi: testAbi,
      args: [{ config: '0x' }],
      opName: 'deployOperator',
      functionNames: {
        deployFn: 'deployOperator',
        getDeployedFn: 'getOperator',
      },
    })

    expect(result.isNew).toBe(true)
    // Verify getOperator was called (not getDeployed)
    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'getOperator' }),
    )
    // Verify deployOperator was called (not deploy)
    expect(walletClient.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'deployOperator' }),
    )
  })
})
