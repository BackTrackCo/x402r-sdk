import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'
import {
  deployMarketplaceOperator,
  type MarketplaceOperatorOptions,
  previewMarketplaceOperator,
} from '../../src/deploy/presets.js'
import { ConfigError } from '../../src/errors/index.js'
import { createMockPublicClient, createMockWalletClient } from '../fixtures.js'

const COMPUTED_ADDR = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as Address

function makeOptions(
  overrides: Partial<MarketplaceOperatorOptions> = {},
): MarketplaceOperatorOptions {
  return {
    chainId: 84532, // Base Sepolia — has factories + conditions
    feeRecipient: '0x5678901234567890123456789012345678901234',
    arbiter: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    escrowPeriodSeconds: 604800n,
    ...overrides,
  }
}

describe('previewMarketplaceOperator', () => {
  it('throws ConfigError for unsupported chainId', async () => {
    const publicClient = createMockPublicClient()

    await expect(
      previewMarketplaceOperator(
        publicClient,
        makeOptions({ chainId: 999999 }),
      ),
    ).rejects.toThrow(ConfigError)
  })

  it('feeCalculatorAddress is null when operatorFeeBps is 0 or omitted', async () => {
    const publicClient = createMockPublicClient({
      computeAddress: COMPUTED_ADDR,
    })

    // Without operatorFeeBps (defaults to 0)
    const result = await previewMarketplaceOperator(publicClient, makeOptions())

    expect(result.feeCalculatorAddress).toBeNull()
    expect(result.operatorConfig.feeCalculator).toBe(zeroAddress)

    // With explicit 0
    const result2 = await previewMarketplaceOperator(
      publicClient,
      makeOptions({ operatorFeeBps: 0n }),
    )
    expect(result2.feeCalculatorAddress).toBeNull()
  })

  it('freezeAddress is null and releaseCondition equals escrowPeriodAddress when freeze disabled', async () => {
    // Use distinct addresses to verify wiring (not just COMPUTED_ADDR === COMPUTED_ADDR)
    let computeCallCount = 0
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // arbiterCondition
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // orCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // operator
    ] as Address[]
    const publicClient = createMockPublicClient({})
    ;(publicClient as any).readContract = async (params: {
      functionName: string
      [k: string]: unknown
    }) => {
      if (params.functionName === 'computeAddress') {
        return addresses[computeCallCount++] ?? COMPUTED_ADDR
      }
      return COMPUTED_ADDR
    }

    const result = await previewMarketplaceOperator(publicClient, makeOptions())

    expect(result.freezeAddress).toBeNull()
    // releaseCondition must literally be the escrowPeriod address (first computed)
    expect(result.operatorConfig.releaseCondition).toBe(addresses[0])
    expect(result.escrowPeriodAddress).toBe(addresses[0])
  })

  it('freezeAddress is non-null and releaseCondition is AndCondition when freeze enabled', async () => {
    let computeCallCount = 0
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // freeze
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // andCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // arbiterCondition
      '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // orCondition
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', // operator
    ] as Address[]
    const publicClient = createMockPublicClient({})
    ;(publicClient as any).readContract = async (params: {
      functionName: string
      [k: string]: unknown
    }) => {
      if (params.functionName === 'computeAddress') {
        return addresses[computeCallCount++] ?? COMPUTED_ADDR
      }
      return COMPUTED_ADDR
    }

    const result = await previewMarketplaceOperator(
      publicClient,
      makeOptions({ freezeDurationSeconds: 86400n }),
    )

    expect(result.freezeAddress).toBe(addresses[1]) // freeze address
    expect(result.operatorConfig.releaseCondition).toBe(addresses[2]) // andCondition, NOT escrowPeriod
    expect(result.operatorConfig.releaseCondition).not.toBe(
      result.escrowPeriodAddress,
    )
  })

  it('feeCalculatorAddress is non-null when operatorFeeBps > 0', async () => {
    const publicClient = createMockPublicClient({
      computeAddress: COMPUTED_ADDR,
    })

    const result = await previewMarketplaceOperator(
      publicClient,
      makeOptions({ operatorFeeBps: 100n }),
    )

    expect(result.feeCalculatorAddress).toBe(COMPUTED_ADDR)
    expect(result.operatorConfig.feeCalculator).toBe(COMPUTED_ADDR)
  })
})

describe('deployMarketplaceOperator', () => {
  it('summary correctly counts new vs existing (freeze disabled)', async () => {
    let getDeployedCallCount = 0
    let computeCallCount = 0
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // arbiterCondition
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // orCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // operator
    ] as Address[]
    const publicClient = createMockPublicClient({})

    ;(publicClient as any).readContract = async (params: {
      functionName: string
      [k: string]: unknown
    }) => {
      if (params.functionName === 'computeAddress') {
        return addresses[computeCallCount++] ?? COMPUTED_ADDR
      }
      if (
        params.functionName === 'getDeployed' ||
        params.functionName === 'getOperator'
      ) {
        getDeployedCallCount++
        // First 2 are new (return zero), rest are existing (return non-zero)
        return getDeployedCallCount <= 2 ? zeroAddress : COMPUTED_ADDR
      }
      return COMPUTED_ADDR
    }

    const walletClient = createMockWalletClient()
    ;(publicClient as any).waitForTransactionReceipt = async () => ({
      status: 'success',
    })

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions(),
    )

    // Without freeze or fee calculator: escrow + arbiterCondition + orCondition + operator = 4
    expect(result.deployments).toHaveLength(4)
    expect(result.freezeAddress).toBeNull()
    // releaseCondition is escrowPeriod (first address), not some other contract
    expect(result.operatorConfig.releaseCondition).toBe(addresses[0])
    expect(result.escrowPeriodAddress).toBe(addresses[0])
    expect(result.summary.newCount).toBe(2)
    expect(result.summary.existingCount).toBe(2)
    expect(result.summary.txHashes).toHaveLength(2)
  })

  it('deploys feeCalculator when operatorFeeBps > 0', async () => {
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      getOperator: zeroAddress,
      computeAddress: COMPUTED_ADDR,
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions({ operatorFeeBps: 100n }),
    )

    // Without freeze, with fee calculator: escrow + arbiterCondition + orCondition + feeCalc + operator = 5
    expect(result.deployments).toHaveLength(5)
    expect(result.feeCalculatorAddress).toBe(COMPUTED_ADDR)
  })

  it('deploys freeze + andCondition when freezeDurationSeconds > 0', async () => {
    // Use a counter to return distinct addresses so we can verify releaseCondition differs
    let computeCallCount = 0
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // freeze
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // andCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // arbiterCondition
      '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // orCondition
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', // operator
    ] as Address[]
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      getOperator: zeroAddress,
    })
    ;(publicClient as any).readContract = async (params: {
      functionName: string
      [k: string]: unknown
    }) => {
      if (params.functionName === 'computeAddress') {
        return addresses[computeCallCount++] ?? COMPUTED_ADDR
      }
      if (
        params.functionName === 'getDeployed' ||
        params.functionName === 'getOperator'
      ) {
        return zeroAddress
      }
      return COMPUTED_ADDR
    }
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions({ freezeDurationSeconds: 86400n }),
    )

    // With freeze: escrow + freeze + andCondition + arbiterCondition + orCondition + operator = 6
    expect(result.deployments).toHaveLength(6)
    expect(result.freezeAddress).not.toBeNull()
    // releaseCondition should be the AndCondition address, not escrowPeriodAddress
    expect(result.operatorConfig.releaseCondition).not.toBe(
      result.escrowPeriodAddress,
    )
  })

  it('skips freeze when freezeDurationSeconds omitted', async () => {
    let computeCallCount = 0
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // arbiterCondition
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // orCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // operator
    ] as Address[]
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      getOperator: zeroAddress,
    })
    ;(publicClient as any).readContract = async (params: {
      functionName: string
      [k: string]: unknown
    }) => {
      if (params.functionName === 'computeAddress') {
        return addresses[computeCallCount++] ?? COMPUTED_ADDR
      }
      if (
        params.functionName === 'getDeployed' ||
        params.functionName === 'getOperator'
      ) {
        return zeroAddress
      }
      return COMPUTED_ADDR
    }
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions(),
    )

    expect(result.freezeAddress).toBeNull()
    expect(result.operatorConfig.releaseCondition).toBe(addresses[0])
    expect(result.operatorConfig.releaseCondition).toBe(
      result.escrowPeriodAddress,
    )
  })
})
