import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'
import {
  deployMarketplaceOperator,
  type MarketplaceOperatorOptions,
  previewMarketplaceOperator,
} from '../../src/deploy/presets.js'
import { ConfigError } from '../../src/errors/index.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createSequentialMockPublicClient,
} from '../fixtures.js'

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
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // signatureCondition
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // orCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // signatureRefundRequest
      '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // operator
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)

    const result = await previewMarketplaceOperator(publicClient, makeOptions())

    expect(result.freezeAddress).toBeNull()
    // releaseCondition must literally be the escrowPeriod address (first computed)
    expect(result.operatorConfig.releaseCondition).toBe(addresses[0])
    expect(result.escrowPeriodAddress).toBe(addresses[0])
  })

  it('freezeAddress is non-null and releaseCondition is AndCondition when freeze enabled', async () => {
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // freeze
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // andCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // signatureCondition
      '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // orCondition
      '0x1111111111111111111111111111111111111111', // signatureRefundRequest
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', // operator
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)

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
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // signatureCondition
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // orCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // signatureRefundRequest
      '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // operator
    ] as Address[]
    // First 2 are new (return zero), rest are existing (return non-zero)
    const publicClient = createSequentialMockPublicClient(addresses, {
      getDeployedBehavior: (idx) => (idx < 2 ? zeroAddress : COMPUTED_ADDR),
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions(),
    )

    // Without freeze or fee calculator: escrow + signatureCondition + orCondition + signatureRefundRequest + operator = 5
    expect(result.deployments).toHaveLength(5)
    expect(result.freezeAddress).toBeNull()
    // releaseCondition is escrowPeriod (first address), not some other contract
    expect(result.operatorConfig.releaseCondition).toBe(addresses[0])
    expect(result.escrowPeriodAddress).toBe(addresses[0])
    expect(result.summary.newCount).toBe(2)
    expect(result.summary.existingCount).toBe(3)
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

    // Without freeze, with fee calculator: escrow + signatureCondition + orCondition + signatureRefundRequest + feeCalc + operator = 6
    expect(result.deployments).toHaveLength(6)
    expect(result.feeCalculatorAddress).toBe(COMPUTED_ADDR)
  })

  it('deploys freeze + andCondition when freezeDurationSeconds > 0', async () => {
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // freeze
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // andCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // signatureCondition
      '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // orCondition
      '0x1111111111111111111111111111111111111111', // signatureRefundRequest
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', // operator
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions({ freezeDurationSeconds: 86400n }),
    )

    // With freeze: escrow + freeze + andCondition + signatureCondition + orCondition + signatureRefundRequest + operator = 7
    expect(result.deployments).toHaveLength(7)
    expect(result.freezeAddress).not.toBeNull()
    // releaseCondition should be the AndCondition address, not escrowPeriodAddress
    expect(result.operatorConfig.releaseCondition).not.toBe(
      result.escrowPeriodAddress,
    )
  })

  it('skips freeze when freezeDurationSeconds omitted', async () => {
    const addresses = [
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // escrowPeriod
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', // signatureCondition
      '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', // orCondition
      '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', // signatureRefundRequest
      '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // operator
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
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
