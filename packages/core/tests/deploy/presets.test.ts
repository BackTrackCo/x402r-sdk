import type { Address } from 'viem'
import { zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'
import { getFactoryAddresses } from '../../src/config/index.js'
import {
  type ArbiterSetupOptions,
  deployArbiterSetup,
  deployMarketplaceOperator,
  type MarketplaceOperatorOptions,
  previewArbiterSetup,
  previewMarketplaceOperator,
} from '../../src/deploy/presets.js'
import { ConfigError } from '../../src/errors/index.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockWalletWithoutAccount,
  createSequentialMockPublicClient,
} from '../fixtures.js'

const COMPUTED_ADDR = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
const F = getFactoryAddresses(84532)

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
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const sigCondAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const sigRefundAddr =
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.signatureCondition}:computeAddress`]: sigCondAddr,
      [`${F.orCondition}:computeAddress`]: orAddr,
      [`${F.signatureRefundRequest}:computeAddress`]: sigRefundAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })

    const result = await previewMarketplaceOperator(publicClient, makeOptions())

    expect(result.freezeAddress).toBeNull()
    expect(result.operatorConfig.releaseCondition).toBe(escrowAddr)
    expect(result.escrowPeriodAddress).toBe(escrowAddr)
    expect(result.signatureRefundRequestAddress).toBe(sigRefundAddr)
  })

  it('freezeAddress is non-null and releaseCondition is AndCondition when freeze enabled', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const freezeAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const andAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const sigCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const orAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const sigRefundAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const operatorAddr = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.signatureCondition}:computeAddress`]: sigCondAddr,
      [`${F.freeze}:computeAddress`]: freezeAddr,
      [`${F.orCondition}:computeAddress`]: orAddr,
      [`${F.signatureRefundRequest}:computeAddress`]: sigRefundAddr,
      [`${F.andCondition}:computeAddress`]: andAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })

    const result = await previewMarketplaceOperator(
      publicClient,
      makeOptions({ freezeDurationSeconds: 86400n }),
    )

    expect(result.freezeAddress).toBe(freezeAddr)
    expect(result.operatorConfig.releaseCondition).toBe(andAddr)
    expect(result.operatorConfig.releaseCondition).not.toBe(
      result.escrowPeriodAddress,
    )
    expect(result.signatureRefundRequestAddress).toBe(sigRefundAddr)
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
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const sigCondAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const sigRefundAddr =
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    // escrowPeriod + signatureCondition are new; orCondition + signatureRefundRequest are existing; operator always new
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.signatureCondition}:getDeployed`]: zeroAddress,
      [`${F.signatureCondition}:computeAddress`]: sigCondAddr,
      [`${F.orCondition}:getDeployed`]: orAddr,
      [`${F.orCondition}:computeAddress`]: orAddr,
      [`${F.signatureRefundRequest}:getDeployed`]: sigRefundAddr,
      [`${F.signatureRefundRequest}:computeAddress`]: sigRefundAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
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
    expect(result.operatorConfig.releaseCondition).toBe(escrowAddr)
    expect(result.escrowPeriodAddress).toBe(escrowAddr)
    expect(result.signatureRefundRequestAddress).toBe(sigRefundAddr)
    // 3 new (escrow + sigCond + operator), 2 existing (orCond + sigRefund)
    expect(result.summary.newCount).toBe(3)
    expect(result.summary.existingCount).toBe(2)
    expect(result.summary.txHashes).toHaveLength(1) // batched into single Multicall3 tx
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
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const freezeAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const andAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const sigCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const orAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const sigRefundAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const operatorAddr = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.signatureCondition}:getDeployed`]: zeroAddress,
      [`${F.signatureCondition}:computeAddress`]: sigCondAddr,
      [`${F.freeze}:getDeployed`]: zeroAddress,
      [`${F.freeze}:computeAddress`]: freezeAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orAddr,
      [`${F.signatureRefundRequest}:getDeployed`]: zeroAddress,
      [`${F.signatureRefundRequest}:computeAddress`]: sigRefundAddr,
      [`${F.andCondition}:getDeployed`]: zeroAddress,
      [`${F.andCondition}:computeAddress`]: andAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions({ freezeDurationSeconds: 86400n }),
    )

    // With freeze: escrow + freeze + andCondition + signatureCondition + orCondition + signatureRefundRequest + operator = 7
    expect(result.deployments).toHaveLength(7)
    expect(result.freezeAddress).not.toBeNull()
    expect(result.operatorConfig.releaseCondition).not.toBe(
      result.escrowPeriodAddress,
    )
    expect(result.signatureRefundRequestAddress).toBe(sigRefundAddr)
  })

  it('returns all existing when operator already deployed (no freeze, no fee)', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const sigCondAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const sigRefundAddr =
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.signatureCondition}:computeAddress`]: sigCondAddr,
      [`${F.orCondition}:computeAddress`]: orAddr,
      [`${F.signatureRefundRequest}:computeAddress`]: sigRefundAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.escrowPeriod}:getDeployed`]: escrowAddr,
      [`${F.signatureCondition}:getDeployed`]: sigCondAddr,
      [`${F.orCondition}:getDeployed`]: orAddr,
      [`${F.signatureRefundRequest}:getDeployed`]: sigRefundAddr,
      [`${F.paymentOperator}:getOperator`]: operatorAddr,
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions(),
    )

    expect(result.deployments).toHaveLength(5)
    expect(result.summary.newCount).toBe(0)
    expect(result.summary.existingCount).toBe(5)
    expect(result.summary.txHashes).toHaveLength(0)
    for (const d of result.deployments) {
      expect(d.isNew).toBe(false)
      expect(d.hash).toBeNull()
    }
  })

  it('returns all existing including freeze + fee when operator already deployed', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const freezeAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const andAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const sigCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const orAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const sigRefundAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const feeAddr = '0x2222222222222222222222222222222222222222' as Address
    const operatorAddr = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.signatureCondition}:computeAddress`]: sigCondAddr,
      [`${F.freeze}:computeAddress`]: freezeAddr,
      [`${F.orCondition}:computeAddress`]: orAddr,
      [`${F.signatureRefundRequest}:computeAddress`]: sigRefundAddr,
      [`${F.andCondition}:computeAddress`]: andAddr,
      [`${F.staticFeeCalculator}:computeAddress`]: feeAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.escrowPeriod}:getDeployed`]: escrowAddr,
      [`${F.signatureCondition}:getDeployed`]: sigCondAddr,
      [`${F.freeze}:getDeployed`]: freezeAddr,
      [`${F.orCondition}:getDeployed`]: orAddr,
      [`${F.signatureRefundRequest}:getDeployed`]: sigRefundAddr,
      [`${F.andCondition}:getDeployed`]: andAddr,
      [`${F.staticFeeCalculator}:getDeployed`]: feeAddr,
      [`${F.paymentOperator}:getOperator`]: operatorAddr,
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions({ freezeDurationSeconds: 86400n, operatorFeeBps: 100n }),
    )

    // escrow + sigCond + orCond + sigRefund + freeze + andCond + feeCal + operator
    expect(result.deployments).toHaveLength(8)
    expect(result.summary.newCount).toBe(0)
    expect(result.summary.existingCount).toBe(8)
    expect(result.summary.txHashes).toHaveLength(0)
    expect(result.freezeAddress).toBe(freezeAddr)
    expect(result.feeCalculatorAddress).toBe(feeAddr)
  })

  it('throws ConfigError when walletClient has no account', async () => {
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      getOperator: zeroAddress,
      computeAddress: COMPUTED_ADDR,
    })
    const walletClient = createMockWalletWithoutAccount()

    await expect(
      deployMarketplaceOperator(walletClient, publicClient, makeOptions()),
    ).rejects.toThrow(ConfigError)
  })

  it('throws ConfigError when a batch call fails in simulation', async () => {
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      getOperator: zeroAddress,
      computeAddress: COMPUTED_ADDR,
    })
    // Override simulateContract to return a failed batch result
    ;(
      publicClient.simulateContract as ReturnType<typeof import('vitest').vi.fn>
    ).mockResolvedValueOnce({
      request: {},
      result: [
        { success: true, returnData: '0x' },
        { success: false, returnData: '0x' }, // second call fails
        { success: true, returnData: '0x' },
      ],
    })
    const walletClient = createMockWalletClient()

    await expect(
      deployMarketplaceOperator(walletClient, publicClient, makeOptions()),
    ).rejects.toThrow('call 1 failed in simulation')
  })

  it('skips freeze when freezeDurationSeconds omitted', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const sigCondAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const sigRefundAddr =
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.signatureCondition}:getDeployed`]: zeroAddress,
      [`${F.signatureCondition}:computeAddress`]: sigCondAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orAddr,
      [`${F.signatureRefundRequest}:getDeployed`]: zeroAddress,
      [`${F.signatureRefundRequest}:computeAddress`]: sigRefundAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions(),
    )

    expect(result.freezeAddress).toBeNull()
    expect(result.operatorConfig.releaseCondition).toBe(escrowAddr)
    expect(result.operatorConfig.releaseCondition).toBe(
      result.escrowPeriodAddress,
    )
    expect(result.signatureRefundRequestAddress).toBe(sigRefundAddr)
  })
})

// ---------------------------------------------------------------------------
// Arbiter setup
// ---------------------------------------------------------------------------

function makeArbiterOptions(
  overrides: Partial<ArbiterSetupOptions> = {},
): ArbiterSetupOptions {
  return {
    chainId: 84532,
    arbiter: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    ...overrides,
  }
}

describe('previewArbiterSetup', () => {
  it('computes signatureCondition and signatureRefundRequest addresses', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa', // signatureCondition
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB', // signatureRefundRequest
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)

    const result = await previewArbiterSetup(publicClient, makeArbiterOptions())

    expect(result.signatureConditionAddress).toBe(addresses[0])
    expect(result.signatureRefundRequestAddress).toBe(addresses[1])
  })

  it('throws ConfigError for unsupported chainId', async () => {
    const publicClient = createMockPublicClient()
    await expect(
      previewArbiterSetup(
        publicClient,
        makeArbiterOptions({ chainId: 999999 }),
      ),
    ).rejects.toThrow(ConfigError)
  })
})

describe('deployArbiterSetup', () => {
  it('deploys exactly 2 contracts (signatureCondition + signatureRefundRequest)', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa', // signatureCondition
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB', // signatureRefundRequest
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
    const walletClient = createMockWalletClient()

    const result = await deployArbiterSetup(
      walletClient,
      publicClient,
      makeArbiterOptions(),
    )

    expect(result.deployments).toHaveLength(2)
    expect(result.signatureConditionAddress).toBe(addresses[0])
    expect(result.signatureRefundRequestAddress).toBe(addresses[1])
    expect(result.summary.newCount).toBe(2)
    expect(result.summary.existingCount).toBe(0)
    expect(result.summary.txHashes).toHaveLength(1) // batched into single Multicall3 tx
  })

  it('is idempotent — reports existing when already deployed', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa', // signatureCondition
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB', // signatureRefundRequest
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses, {
      getDeployedBehavior: 'allExisting',
    })
    const walletClient = createMockWalletClient()

    const result = await deployArbiterSetup(
      walletClient,
      publicClient,
      makeArbiterOptions(),
    )

    expect(result.deployments).toHaveLength(2)
    expect(result.summary.newCount).toBe(0)
    expect(result.summary.existingCount).toBe(2)
    expect(result.summary.txHashes).toHaveLength(0)
  })

  it('deploys only signatureRefundRequest when signatureCondition already exists', async () => {
    const sigCondAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const sigRefundAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const publicClient = createSequentialMockPublicClient(
      [sigCondAddr, sigRefundAddr],
      {
        getDeployedBehavior: (callIndex) =>
          callIndex === 0 ? sigCondAddr : zeroAddress,
      },
    )
    const walletClient = createMockWalletClient()

    const result = await deployArbiterSetup(
      walletClient,
      publicClient,
      makeArbiterOptions(),
    )

    expect(result.deployments).toHaveLength(2)
    expect(result.summary.newCount).toBe(1)
    expect(result.summary.existingCount).toBe(1)
    expect(result.summary.txHashes).toHaveLength(1)
    expect(result.deployments[0].isNew).toBe(false)
    expect(result.deployments[0].address).toBe(sigCondAddr)
    expect(result.deployments[1].isNew).toBe(true)
    expect(result.deployments[1].address).toBe(sigRefundAddr)
  })

  it('throws ConfigError when walletClient has no account', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
    const walletClient = createMockWalletWithoutAccount()

    await expect(
      deployArbiterSetup(walletClient, publicClient, makeArbiterOptions()),
    ).rejects.toThrow(ConfigError)
  })

  it('throws ConfigError when a batch call fails in simulation', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
    // Override simulateContract to return a failed batch result
    ;(
      publicClient.simulateContract as ReturnType<typeof import('vitest').vi.fn>
    ).mockResolvedValueOnce({
      request: {},
      result: [
        { success: true, returnData: '0x' },
        { success: false, returnData: '0x' }, // second call fails
      ],
    })
    const walletClient = createMockWalletClient()

    await expect(
      deployArbiterSetup(walletClient, publicClient, makeArbiterOptions()),
    ).rejects.toThrow('call 1 failed in simulation')
  })
})
