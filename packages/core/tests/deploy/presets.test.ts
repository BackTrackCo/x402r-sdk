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
  it('summary correctly counts new vs existing', async () => {
    // First 3 calls to getDeployed/getOperator return zeroAddress (new)
    // Last 3 calls return non-zero (existing)
    let getDeployedCallCount = 0
    const publicClient = createMockPublicClient({
      computeAddress: COMPUTED_ADDR,
    })

    // Override readContract to alternate between new and existing
    ;(publicClient as any).readContract = async (params: {
      functionName: string
      [k: string]: unknown
    }) => {
      if (
        params.functionName === 'getDeployed' ||
        params.functionName === 'getOperator'
      ) {
        getDeployedCallCount++
        // First 3 are new (return zero), rest are existing (return non-zero)
        return getDeployedCallCount <= 3 ? zeroAddress : COMPUTED_ADDR
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

    // Without fee calculator: escrow + freeze + arbiterCondition + orCondition + operator = 5
    expect(result.deployments).toHaveLength(5)
    expect(result.summary.newCount).toBe(3)
    expect(result.summary.existingCount).toBe(2)
    expect(result.summary.txHashes).toHaveLength(3)
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

    // With fee calculator: escrow + freeze + arbiterCondition + orCondition + feeCalc + operator = 6
    expect(result.deployments).toHaveLength(6)
    expect(result.feeCalculatorAddress).toBe(COMPUTED_ADDR)
  })
})
