import type { Address } from 'viem'
import { pad, zeroAddress } from 'viem'
import { describe, expect, it, type vi } from 'vitest'
import { getFactoryAddresses, x402rChains } from '../../src/config/index.js'
import {
  type ArbiterSetupOptions,
  type DeliveryProtectionOperatorOptions,
  deployArbiterSetup,
  deployDeliveryProtectionOperator,
  deployMarketplaceOperator,
  type MarketplaceOperatorOptions,
  previewArbiterSetup,
  previewDeliveryProtectionOperator,
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
    feeReceiver: '0x5678901234567890123456789012345678901234',
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
    const refundReqAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const evidenceAddr = '0x4444444444444444444444444444444444444444' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const staticAddrCondArbiterAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const orConditionAddr =
      '0x0000000000000000000000000000000000000002' as Address
    const arbiter = makeOptions().arbiter
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.refundRequest}:computeAddress`]: refundReqAddr,
      [`${F.refundRequestEvidence}:computeAddress`]: evidenceAddr,
      [`${F.staticAddressCondition}:computeAddress:${arbiter}`]:
        staticAddrCondArbiterAddr,
      [`${F.orCondition}:computeAddress`]: orConditionAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })

    const result = await previewMarketplaceOperator(publicClient, makeOptions())

    expect(result.freezeAddress).toBeNull()
    expect(result.operatorConfig.capturePreActionCondition).toBe(escrowAddr)
    expect(result.escrowPeriodAddress).toBe(escrowAddr)
    expect(result.refundRequestAddress).toBe(refundReqAddr)
    // refundInEscrowCondition = OrCondition(receiver, arbiterSAC)
    expect(result.refundInEscrowConditionAddress).toBe(orConditionAddr)
  })

  it('freezeAddress is non-null and releaseCondition is AndCondition when freeze enabled', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const freezeAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const andAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const refundReqAddr =
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const staticAddrCondArbiterAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const evidenceAddr = '0x4444444444444444444444444444444444444444' as Address
    const orConditionAddr =
      '0x0000000000000000000000000000000000000002' as Address
    const operatorAddr = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF' as Address
    const arbiter = makeOptions().arbiter
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.refundRequest}:computeAddress`]: refundReqAddr,
      [`${F.staticAddressCondition}:computeAddress:${arbiter}`]:
        staticAddrCondArbiterAddr,
      [`${F.refundRequestEvidence}:computeAddress`]: evidenceAddr,
      [`${F.orCondition}:computeAddress`]: orConditionAddr,
      [`${F.freeze}:computeAddress`]: freezeAddr,
      [`${F.andCondition}:computeAddress`]: andAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })

    const result = await previewMarketplaceOperator(
      publicClient,
      makeOptions({ freezeDurationSeconds: 86400n }),
    )

    expect(result.freezeAddress).toBe(freezeAddr)
    expect(result.operatorConfig.capturePreActionCondition).toBe(andAddr)
    expect(result.operatorConfig.capturePreActionCondition).not.toBe(
      result.escrowPeriodAddress,
    )
    expect(result.refundRequestAddress).toBe(refundReqAddr)
    // refundInEscrowCondition = OrCondition(receiver, arbiterSAC)
    expect(result.refundInEscrowConditionAddress).toBe(orConditionAddr)
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
    const refundReqAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const evidenceAddr = '0x4444444444444444444444444444444444444444' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const staticAddrCondArbiterAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const orConditionAddr =
      '0x0000000000000000000000000000000000000002' as Address
    const arbiter = makeOptions().arbiter
    // escrowPeriod is new; refundRequest is existing; operator always new
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.refundRequest}:getDeployed`]: refundReqAddr,
      [`${F.refundRequest}:computeAddress`]: refundReqAddr,
      [`${F.refundRequestEvidence}:getDeployed`]: zeroAddress,
      [`${F.refundRequestEvidence}:computeAddress`]: evidenceAddr,
      [`${F.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${F.staticAddressCondition}:computeAddress:${arbiter}`]:
        staticAddrCondArbiterAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orConditionAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions(),
    )

    // Without freeze or fee calculator: escrow + refundRequest + evidence + sacArbiter + orCondition + operator = 6
    expect(result.deployments).toHaveLength(6)
    expect(result.freezeAddress).toBeNull()
    expect(result.operatorConfig.capturePreActionCondition).toBe(escrowAddr)
    expect(result.escrowPeriodAddress).toBe(escrowAddr)
    expect(result.refundRequestAddress).toBe(refundReqAddr)
    expect(result.refundRequestEvidenceAddress).toBe(evidenceAddr)
    // refundInEscrowCondition = OrCondition(receiver, arbiterSAC)
    expect(result.refundInEscrowConditionAddress).toBe(orConditionAddr)
    // 5 new (escrow + evidence + sacArbiter + orCondition + operator), 1 existing (refundRequest)
    expect(result.summary.newCount).toBe(5)
    expect(result.summary.existingCount).toBe(1)
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

    // Without freeze, with fee calculator: escrow + refundRequest + evidence + sacArbiter + orCondition + feeCalc + operator = 7
    expect(result.deployments).toHaveLength(7)
    expect(result.feeCalculatorAddress).toBe(COMPUTED_ADDR)
  })

  it('deploys freeze + andCondition when freezeDurationSeconds > 0', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const freezeAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const andAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const refundReqAddr =
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const staticAddrCondArbiterAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const evidenceAddr = '0x4444444444444444444444444444444444444444' as Address
    const orConditionAddr =
      '0x0000000000000000000000000000000000000002' as Address
    const operatorAddr = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF' as Address
    const arbiter = makeOptions().arbiter
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.refundRequest}:getDeployed`]: zeroAddress,
      [`${F.refundRequest}:computeAddress`]: refundReqAddr,
      [`${F.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${F.staticAddressCondition}:computeAddress:${arbiter}`]:
        staticAddrCondArbiterAddr,
      [`${F.refundRequestEvidence}:getDeployed`]: zeroAddress,
      [`${F.refundRequestEvidence}:computeAddress`]: evidenceAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orConditionAddr,
      [`${F.freeze}:getDeployed`]: zeroAddress,
      [`${F.freeze}:computeAddress`]: freezeAddr,
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

    // With freeze: escrow + refundRequest + evidence + sacArbiter + orCondition + freeze + andCond + operator = 8
    expect(result.deployments).toHaveLength(8)
    expect(result.freezeAddress).not.toBeNull()
    expect(result.operatorConfig.capturePreActionCondition).not.toBe(
      result.escrowPeriodAddress,
    )
    expect(result.refundRequestAddress).toBe(refundReqAddr)
    // refundInEscrowCondition = OrCondition(receiver, arbiterSAC)
    expect(result.refundInEscrowConditionAddress).toBe(orConditionAddr)
  })

  it('returns all existing when operator already deployed (no freeze, no fee)', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const refundReqAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const evidenceAddr = '0x4444444444444444444444444444444444444444' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const staticAddrCondArbiterAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const orConditionAddr =
      '0x0000000000000000000000000000000000000002' as Address
    const arbiter = makeOptions().arbiter
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.refundRequest}:computeAddress`]: refundReqAddr,
      [`${F.refundRequestEvidence}:computeAddress`]: evidenceAddr,
      [`${F.refundRequestEvidence}:getDeployed`]: evidenceAddr,
      [`${F.staticAddressCondition}:computeAddress:${arbiter}`]:
        staticAddrCondArbiterAddr,
      [`${F.staticAddressCondition}:getDeployed`]: staticAddrCondArbiterAddr,
      [`${F.orCondition}:computeAddress`]: orConditionAddr,
      [`${F.orCondition}:getDeployed`]: orConditionAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.escrowPeriod}:getDeployed`]: escrowAddr,
      [`${F.refundRequest}:getDeployed`]: refundReqAddr,
      [`${F.paymentOperator}:getOperator`]: operatorAddr,
    })
    const walletClient = createMockWalletClient()

    const result = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      makeOptions(),
    )

    // escrow + refundRequest + evidence + sacArbiter + orCondition + operator = 6
    expect(result.deployments).toHaveLength(6)
    expect(result.summary.newCount).toBe(0)
    expect(result.summary.existingCount).toBe(6)
    expect(result.summary.txHashes).toHaveLength(0)
    expect(result.refundRequestEvidenceAddress).toBe(evidenceAddr)
    for (const d of result.deployments) {
      expect(d.isNew).toBe(false)
      expect(d.hash).toBeNull()
    }
  })

  it('returns all existing including freeze + fee when operator already deployed', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const freezeAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const andAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const refundReqAddr =
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const staticAddrCondArbiterAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const orConditionAddr =
      '0x0000000000000000000000000000000000000002' as Address
    const feeAddr = '0x2222222222222222222222222222222222222222' as Address
    const evidenceAddr = '0x4444444444444444444444444444444444444444' as Address
    const operatorAddr = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF' as Address
    const arbiter = makeOptions().arbiter
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.refundRequest}:computeAddress`]: refundReqAddr,
      [`${F.staticAddressCondition}:computeAddress:${arbiter}`]:
        staticAddrCondArbiterAddr,
      [`${F.staticAddressCondition}:getDeployed`]: staticAddrCondArbiterAddr,
      [`${F.refundRequestEvidence}:computeAddress`]: evidenceAddr,
      [`${F.refundRequestEvidence}:getDeployed`]: evidenceAddr,
      [`${F.orCondition}:computeAddress`]: orConditionAddr,
      [`${F.orCondition}:getDeployed`]: orConditionAddr,
      [`${F.freeze}:computeAddress`]: freezeAddr,
      [`${F.andCondition}:computeAddress`]: andAddr,
      [`${F.staticFeeCalculator}:computeAddress`]: feeAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.escrowPeriod}:getDeployed`]: escrowAddr,
      [`${F.refundRequest}:getDeployed`]: refundReqAddr,
      [`${F.freeze}:getDeployed`]: freezeAddr,
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

    // escrow + refundRequest + evidence + sacArbiter + orCondition + freeze + andCond + feeCal + operator = 9
    expect(result.deployments).toHaveLength(9)
    expect(result.summary.newCount).toBe(0)
    expect(result.summary.existingCount).toBe(9)
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
    const refundReqAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const evidenceAddr = '0x4444444444444444444444444444444444444444' as Address
    const operatorAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const staticAddrCondArbiterAddr =
      '0x1111111111111111111111111111111111111111' as Address
    const orConditionAddr =
      '0x0000000000000000000000000000000000000002' as Address
    const arbiter = makeOptions().arbiter
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.refundRequest}:getDeployed`]: zeroAddress,
      [`${F.refundRequest}:computeAddress`]: refundReqAddr,
      [`${F.refundRequestEvidence}:getDeployed`]: zeroAddress,
      [`${F.refundRequestEvidence}:computeAddress`]: evidenceAddr,
      [`${F.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${F.staticAddressCondition}:computeAddress:${arbiter}`]:
        staticAddrCondArbiterAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orConditionAddr,
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
    expect(result.operatorConfig.capturePreActionCondition).toBe(escrowAddr)
    expect(result.operatorConfig.capturePreActionCondition).toBe(
      result.escrowPeriodAddress,
    )
    expect(result.refundRequestAddress).toBe(refundReqAddr)
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
  it('computes signatureCondition, refundRequest, and evidence addresses', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa', // signatureCondition
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB', // refundRequest
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC', // refundRequestEvidence
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)

    const result = await previewArbiterSetup(publicClient, makeArbiterOptions())

    expect(result.signatureConditionAddress).toBe(addresses[0])
    expect(result.refundRequestAddress).toBe(addresses[1])
    expect(result.refundRequestEvidenceAddress).toBe(addresses[2])
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
  it('deploys exactly 3 contracts (signatureCondition + refundRequest + evidence)', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa', // signatureCondition
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB', // refundRequest
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC', // refundRequestEvidence
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
    const walletClient = createMockWalletClient()

    const result = await deployArbiterSetup(
      walletClient,
      publicClient,
      makeArbiterOptions(),
    )

    expect(result.deployments).toHaveLength(3)
    expect(result.signatureConditionAddress).toBe(addresses[0])
    expect(result.refundRequestAddress).toBe(addresses[1])
    expect(result.refundRequestEvidenceAddress).toBe(addresses[2])
    expect(result.summary.newCount).toBe(3)
    expect(result.summary.existingCount).toBe(0)
    expect(result.summary.txHashes).toHaveLength(1) // batched into single Multicall3 tx
  })

  it('is idempotent — reports existing when already deployed', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa', // signatureCondition
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB', // refundRequest
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC', // refundRequestEvidence
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

    expect(result.deployments).toHaveLength(3)
    expect(result.summary.newCount).toBe(0)
    expect(result.summary.existingCount).toBe(3)
    expect(result.summary.txHashes).toHaveLength(0)
  })

  it('deploys only refundRequest + evidence when signatureCondition already exists', async () => {
    const sigCondAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const refundReqAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const evidenceAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createSequentialMockPublicClient(
      [sigCondAddr, refundReqAddr, evidenceAddr],
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

    expect(result.deployments).toHaveLength(3)
    expect(result.summary.newCount).toBe(2)
    expect(result.summary.existingCount).toBe(1)
    expect(result.summary.txHashes).toHaveLength(1)
    expect(result.deployments[0].isNew).toBe(false)
    expect(result.deployments[0].address).toBe(sigCondAddr)
    expect(result.deployments[1].isNew).toBe(true)
    expect(result.deployments[1].address).toBe(refundReqAddr)
    expect(result.deployments[2].isNew).toBe(true)
    expect(result.deployments[2].address).toBe(evidenceAddr)
  })

  it('deploys signatureCondition + evidence when refundRequest already exists', async () => {
    const sigCondAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const refundReqAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const evidenceAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createSequentialMockPublicClient(
      [sigCondAddr, refundReqAddr, evidenceAddr],
      {
        getDeployedBehavior: (callIndex) =>
          callIndex === 1 ? refundReqAddr : zeroAddress,
      },
    )
    const walletClient = createMockWalletClient()

    const result = await deployArbiterSetup(
      walletClient,
      publicClient,
      makeArbiterOptions(),
    )

    expect(result.deployments).toHaveLength(3)
    expect(result.summary.newCount).toBe(2)
    expect(result.summary.existingCount).toBe(1)
    expect(result.summary.txHashes).toHaveLength(1)
    expect(result.deployments[0].isNew).toBe(true)
    expect(result.deployments[0].address).toBe(sigCondAddr)
    expect(result.deployments[1].isNew).toBe(false)
    expect(result.deployments[1].address).toBe(refundReqAddr)
    expect(result.deployments[2].isNew).toBe(true)
    expect(result.deployments[2].address).toBe(evidenceAddr)
  })

  it('throws ConfigError when walletClient has no account', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
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
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
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

  it('retries deploy when bytecode missing after batch tx', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
    // First getCode returns no bytecode (triggers retry), then valid
    ;(publicClient.getCode as ReturnType<typeof vi.fn>)
      .mockReset()
      .mockResolvedValueOnce('0x')
      .mockResolvedValue('0x600160005260206000f3')
    const walletClient = createMockWalletClient()

    const result = await deployArbiterSetup(
      walletClient,
      publicClient,
      makeArbiterOptions(),
    )

    expect(result.deployments).toHaveLength(3)
    expect(result.summary.txHashes).toHaveLength(2)
  })

  it('throws ConfigError when retry deploy also has no bytecode', async () => {
    const addresses = [
      '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    ] as Address[]
    const publicClient = createSequentialMockPublicClient(addresses)
    // getCode always returns no bytecode — retry also fails
    ;(publicClient.getCode as ReturnType<typeof vi.fn>)
      .mockReset()
      .mockResolvedValue('0x')
    const walletClient = createMockWalletClient()

    await expect(
      deployArbiterSetup(walletClient, publicClient, makeArbiterOptions()),
    ).rejects.toThrow('Deploy verification failed')
  })

  it('deploys only signatureCondition when refundRequest + evidence already exist', async () => {
    const sigCondAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const refundReqAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const evidenceAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createSequentialMockPublicClient(
      [sigCondAddr, refundReqAddr, evidenceAddr],
      {
        getDeployedBehavior: (callIndex) =>
          callIndex === 0 ? zeroAddress : COMPUTED_ADDR,
      },
    )
    const walletClient = createMockWalletClient()

    const result = await deployArbiterSetup(
      walletClient,
      publicClient,
      makeArbiterOptions(),
    )

    expect(result.deployments).toHaveLength(3)
    expect(result.summary.newCount).toBe(1)
    expect(result.summary.existingCount).toBe(2)
    expect(result.deployments[0].isNew).toBe(true)
    expect(result.deployments[1].isNew).toBe(false)
    expect(result.deployments[2].isNew).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Delivery protection operator
// ---------------------------------------------------------------------------

function makeDeliveryProtectionOptions(
  overrides: Partial<DeliveryProtectionOperatorOptions> = {},
): DeliveryProtectionOperatorOptions {
  return {
    chainId: 84532,
    arbiter: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    feeReceiver: '0x5678901234567890123456789012345678901234',
    escrowPeriodSeconds: 86400n,
    ...overrides,
  }
}

describe('previewDeliveryProtectionOperator', () => {
  it('throws ConfigError for unsupported chainId', async () => {
    const publicClient = createMockPublicClient()
    await expect(
      previewDeliveryProtectionOperator(
        publicClient,
        makeDeliveryProtectionOptions({ chainId: 999999 }),
      ),
    ).rejects.toThrow(ConfigError)
  })

  it('computes all addresses including OrConditions and HookCombinator', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const arbiterCondAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const combinatorAddr =
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.staticAddressCondition}:computeAddress`]: arbiterCondAddr,
      [`${F.orCondition}:computeAddress`]: orCondAddr,
      [`${F.hookCombinator}:computeAddress`]: combinatorAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })

    const result = await previewDeliveryProtectionOperator(
      publicClient,
      makeDeliveryProtectionOptions(),
    )

    expect(result.escrowPeriodAddress).toBe(escrowAddr)
    expect(result.arbiterConditionAddress).toBe(arbiterCondAddr)
    expect(result.releaseConditionAddress).toBe(orCondAddr)
    expect(result.refundInEscrowConditionAddress).toBe(orCondAddr)
    expect(result.authorizeHookAddress).toBe(combinatorAddr)
    expect(result.operatorConfig.authorizePostActionHook).toBe(combinatorAddr)
    expect(result.operatorConfig.capturePreActionCondition).toBe(orCondAddr)
    expect(result.operatorConfig.voidPreActionCondition).toBe(orCondAddr)
    expect(result.operatorConfig.feeCalculator).toBe(zeroAddress)
    expect(result.operatorConfig.authorizePreActionCondition).toBe(zeroAddress)
    expect(result.operatorConfig.refundPreActionCondition).toBe(
      x402rChains[84532].conditions!.receiver,
    )
  })

  it('falls back to EscrowPeriod recorder when PaymentIndexHook is zeroAddress', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createMockPublicClient({
      computeAddress: escrowAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })

    const result = await previewDeliveryProtectionOperator(
      publicClient,
      makeDeliveryProtectionOptions({
        paymentIndexHookAddress: zeroAddress,
      }),
    )

    // Without PaymentIndexHook, authorizeRecorder falls back to escrowPeriod
    expect(result.authorizeHookAddress).toBe(escrowAddr)
    expect(result.paymentIndexHookAddress).toBe(zeroAddress)
  })

  it('uses provided feeReceiver in operator config', async () => {
    const feeReceiver = '0x9999999999999999999999999999999999999999' as Address
    const publicClient = createMockPublicClient({
      computeAddress: COMPUTED_ADDR,
    })

    const result = await previewDeliveryProtectionOperator(
      publicClient,
      makeDeliveryProtectionOptions({ feeReceiver }),
    )

    expect(result.operatorConfig.feeReceiver).toBe(feeReceiver)
  })

  it('uses hookCombinatorCodehash as default authorizedCodehash', async () => {
    const publicClient = createMockPublicClient({
      computeAddress: COMPUTED_ADDR,
    })
    // Default: uses hookCombinatorCodehash from config
    const defaultResult = await previewDeliveryProtectionOperator(
      publicClient,
      makeDeliveryProtectionOptions(),
    )
    expect(defaultResult.escrowPeriodAddress).toBe(COMPUTED_ADDR)
  })

  it('accepts custom authorizedCodehash override', async () => {
    const publicClient = createMockPublicClient({
      computeAddress: COMPUTED_ADDR,
    })
    const result = await previewDeliveryProtectionOperator(
      publicClient,
      makeDeliveryProtectionOptions({ authorizedCodehash: pad('0x00') }),
    )
    expect(result.escrowPeriodAddress).toBe(COMPUTED_ADDR)
  })

  it('includes arbiter in refundInEscrow OrCondition when allowArbiterRefund is true', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const arbiterCondAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const combinatorAddr =
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.staticAddressCondition}:computeAddress`]: arbiterCondAddr,
      [`${F.orCondition}:computeAddress`]: orCondAddr,
      [`${F.hookCombinator}:computeAddress`]: combinatorAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
    })

    const result = await previewDeliveryProtectionOperator(
      publicClient,
      makeDeliveryProtectionOptions({ allowArbiterRefund: true }),
    )

    // Release includes arbiter (arbiter OR payer)
    expect(result.releaseConditionAddress).toBe(orCondAddr)
    // RefundInEscrow includes arbiter (escrow period OR receiver OR arbiter)
    expect(result.refundInEscrowConditionAddress).toBe(orCondAddr)
    expect(result.operatorAddress).toBe(operatorAddr)
  })
})

describe('deployDeliveryProtectionOperator', () => {
  // Deploys 6 contracts: escrowPeriod, arbiterCondition, orCondition(release),
  // orCondition(refund), hookCombinator, operator
  it('deploys 6 contracts', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const arbiterCondAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const combinatorAddr =
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.staticAddressCondition}:computeAddress`]: arbiterCondAddr,
      [`${F.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orCondAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.hookCombinator}:computeAddress`]: combinatorAddr,
      [`${F.hookCombinator}:getDeployed`]: zeroAddress,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
    })
    const walletClient = createMockWalletClient()

    const result = await deployDeliveryProtectionOperator(
      walletClient,
      publicClient,
      makeDeliveryProtectionOptions(),
    )

    expect(result.deployments).toHaveLength(6)
    expect(result.escrowPeriodAddress).toBe(escrowAddr)
    expect(result.arbiterConditionAddress).toBe(arbiterCondAddr)
    expect(result.releaseConditionAddress).toBe(orCondAddr)
    expect(result.refundInEscrowConditionAddress).toBe(orCondAddr)
    expect(result.authorizeHookAddress).toBe(combinatorAddr)
    expect(result.operatorAddress).toBe(operatorAddr)
    expect(result.summary.newCount).toBe(6)
    expect(result.summary.existingCount).toBe(0)
    expect(result.summary.txHashes).toHaveLength(1)
    expect(result.operatorConfig.capturePreActionCondition).toBe(orCondAddr)
    expect(result.operatorConfig.voidPreActionCondition).toBe(orCondAddr)
    expect(result.operatorConfig.feeCalculator).toBe(zeroAddress)
    expect(result.operatorConfig.authorizePostActionHook).toBe(combinatorAddr)
  })

  it('returns all existing when operator already deployed', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const arbiterCondAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const combinatorAddr =
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.escrowPeriod}:getDeployed`]: escrowAddr,
      [`${F.staticAddressCondition}:computeAddress`]: arbiterCondAddr,
      [`${F.staticAddressCondition}:getDeployed`]: arbiterCondAddr,
      [`${F.orCondition}:computeAddress`]: orCondAddr,
      [`${F.orCondition}:getDeployed`]: orCondAddr,
      [`${F.hookCombinator}:computeAddress`]: combinatorAddr,
      [`${F.hookCombinator}:getDeployed`]: combinatorAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.paymentOperator}:getOperator`]: operatorAddr,
    })
    const walletClient = createMockWalletClient()

    const result = await deployDeliveryProtectionOperator(
      walletClient,
      publicClient,
      makeDeliveryProtectionOptions(),
    )

    expect(result.deployments).toHaveLength(6)
    expect(result.summary.newCount).toBe(0)
    expect(result.summary.existingCount).toBe(6)
    expect(result.summary.txHashes).toHaveLength(0)
    for (const d of result.deployments) {
      expect(d.isNew).toBe(false)
      expect(d.hash).toBeNull()
    }
  })

  it('deploys only missing contracts when some already exist', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const arbiterCondAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const combinatorAddr =
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    // escrowPeriod + combinator exist, everything else is new
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.escrowPeriod}:getDeployed`]: escrowAddr,
      [`${F.staticAddressCondition}:computeAddress`]: arbiterCondAddr,
      [`${F.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orCondAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.hookCombinator}:computeAddress`]: combinatorAddr,
      [`${F.hookCombinator}:getDeployed`]: combinatorAddr,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
    })
    const walletClient = createMockWalletClient()

    const result = await deployDeliveryProtectionOperator(
      walletClient,
      publicClient,
      makeDeliveryProtectionOptions(),
    )

    expect(result.deployments).toHaveLength(6)
    expect(result.summary.newCount).toBe(4)
    expect(result.summary.existingCount).toBe(2)
    expect(result.deployments[0].isNew).toBe(false) // escrowPeriod
    expect(result.deployments[1].isNew).toBe(true) // arbiterCondition
    expect(result.deployments[4].isNew).toBe(false) // hookCombinator
  })

  it('deploys 5 contracts when PaymentIndexHook is zeroAddress', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const arbiterCondAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.staticAddressCondition}:computeAddress`]: arbiterCondAddr,
      [`${F.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orCondAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
    })
    const walletClient = createMockWalletClient()

    const result = await deployDeliveryProtectionOperator(
      walletClient,
      publicClient,
      makeDeliveryProtectionOptions({
        paymentIndexHookAddress: zeroAddress,
      }),
    )

    expect(result.deployments).toHaveLength(5)
    expect(result.authorizeHookAddress).toBe(escrowAddr)
    expect(result.operatorConfig.authorizePostActionHook).toBe(escrowAddr)
    expect(result.summary.newCount).toBe(5)
    expect(result.summary.existingCount).toBe(0)
  })

  it('deploys 6 contracts with allowArbiterRefund true', async () => {
    const escrowAddr = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa' as Address
    const arbiterCondAddr =
      '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' as Address
    const orCondAddr = '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd' as Address
    const combinatorAddr =
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
    const operatorAddr = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC' as Address
    const publicClient = createMockPublicClient({
      [`${F.escrowPeriod}:computeAddress`]: escrowAddr,
      [`${F.escrowPeriod}:getDeployed`]: zeroAddress,
      [`${F.staticAddressCondition}:computeAddress`]: arbiterCondAddr,
      [`${F.staticAddressCondition}:getDeployed`]: zeroAddress,
      [`${F.orCondition}:computeAddress`]: orCondAddr,
      [`${F.orCondition}:getDeployed`]: zeroAddress,
      [`${F.hookCombinator}:computeAddress`]: combinatorAddr,
      [`${F.hookCombinator}:getDeployed`]: zeroAddress,
      [`${F.paymentOperator}:computeAddress`]: operatorAddr,
      [`${F.paymentOperator}:getOperator`]: zeroAddress,
    })
    const walletClient = createMockWalletClient()

    const result = await deployDeliveryProtectionOperator(
      walletClient,
      publicClient,
      makeDeliveryProtectionOptions({ allowArbiterRefund: true }),
    )

    expect(result.deployments).toHaveLength(6)
    expect(result.summary.newCount).toBe(6)
    // Release includes arbiter (arbiter OR payer)
    expect(result.operatorConfig.capturePreActionCondition).toBe(orCondAddr)
    // RefundInEscrow includes arbiter (escrow period OR receiver OR arbiter)
    expect(result.operatorConfig.voidPreActionCondition).toBe(orCondAddr)
  })

  it('throws ConfigError when walletClient has no account', async () => {
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      getOperator: zeroAddress,
      computeAddress: COMPUTED_ADDR,
    })
    const walletClient = createMockWalletWithoutAccount()

    await expect(
      deployDeliveryProtectionOperator(
        walletClient,
        publicClient,
        makeDeliveryProtectionOptions(),
      ),
    ).rejects.toThrow(ConfigError)
  })

  it('throws ConfigError when a batch call fails in simulation', async () => {
    const publicClient = createMockPublicClient({
      getDeployed: zeroAddress,
      getOperator: zeroAddress,
      computeAddress: COMPUTED_ADDR,
    })
    ;(
      publicClient.simulateContract as ReturnType<typeof import('vitest').vi.fn>
    ).mockResolvedValueOnce({
      request: {},
      result: [
        { success: true, returnData: '0x' },
        { success: false, returnData: '0x' },
      ],
    })
    const walletClient = createMockWalletClient()

    await expect(
      deployDeliveryProtectionOperator(
        walletClient,
        publicClient,
        makeDeliveryProtectionOptions(),
      ),
    ).rejects.toThrow('call 1 failed in simulation')
  })
})
