import type { Address, PublicClient, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { freezeAbi } from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import {
  computeFeeCalculatorAddress,
  computeStaticAddressConditionAddress,
  type DeliveryProtectionOperatorOptions,
  deployDeliveryProtectionOperator,
  deployMarketplaceOperator,
  type MarketplaceOperatorOptions,
  previewDeliveryProtectionOperator,
  previewMarketplaceOperator,
} from '../../src/deploy/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { testRoles } from '../setup/constants.js'

const baseSepolia = x402rChains[84532]
const factories = baseSepolia.factories!

function makeOptions(
  overrides: Partial<MarketplaceOperatorOptions> = {},
): MarketplaceOperatorOptions {
  return {
    chainId: 84532,
    feeReceiver: testRoles.operatorFeeRecipient.address,
    arbiter: testRoles.arbiter.address,
    escrowPeriodSeconds: 259200n, // 3 days — distinct from payment-lifecycle fixtures (7 days)
    operatorFeeBps: 100n, // distinct from payment-lifecycle fixtures (50)
    ...overrides,
  }
}

describe('Deploy Module (Fork)', () => {
  let publicClient: PublicClient
  let walletClient: WalletClient

  beforeAll(async () => {
    publicClient = anvilBaseSepolia.getPublicClient()
    walletClient = anvilBaseSepolia.getWalletClient(testRoles.deployer.address)
  })

  it('computeFeeCalculatorAddress returns deterministic non-zero address', async () => {
    const address = await computeFeeCalculatorAddress(publicClient, {
      factoryAddress: factories.staticFeeCalculator,
      feeBps: 50n,
    })

    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(address).not.toBe('0x0000000000000000000000000000000000000000')
  })

  it('previewMarketplaceOperator returns valid non-zero addresses', async () => {
    const preview = await previewMarketplaceOperator(
      publicClient,
      makeOptions(),
    )

    expect(preview.operatorAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(preview.escrowPeriodAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    // freezeAddress should be null when freezeDurationSeconds is not set
    expect(preview.freezeAddress).toBeNull()
    expect(preview.refundRequestAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(preview.voidConditionAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(preview.feeCalculatorAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)

    // All addresses should be non-zero
    const zero = '0x0000000000000000000000000000000000000000'
    expect(preview.operatorAddress).not.toBe(zero)
    expect(preview.escrowPeriodAddress).not.toBe(zero)
    // freezeAddress is null (no freeze configured), skip zero-check
    expect(preview.refundRequestAddress).not.toBe(zero)
    expect(preview.voidConditionAddress).not.toBe(zero)
  })

  it('deployMarketplaceOperator deploys all components matching preview', async () => {
    const options = makeOptions()

    const preview = await previewMarketplaceOperator(publicClient, options)
    const deployment = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      options,
    )

    // All deployed addresses should match previewed addresses
    expect(deployment.operatorAddress).toBe(preview.operatorAddress)
    expect(deployment.escrowPeriodAddress).toBe(preview.escrowPeriodAddress)
    expect(deployment.freezeAddress).toBe(preview.freezeAddress)
    expect(deployment.refundRequestAddress).toBe(preview.refundRequestAddress)
    expect(deployment.voidConditionAddress).toBe(preview.voidConditionAddress)
    expect(deployment.feeCalculatorAddress).toBe(preview.feeCalculatorAddress)

    // Evidence contract deployed and has bytecode
    expect(deployment.refundRequestEvidenceAddress).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    )
    const evidenceCode = await publicClient.getCode({
      address: deployment.refundRequestEvidenceAddress as Address,
    })
    expect(evidenceCode).not.toBe('0x')

    // No freeze, with fee: escrow + refundRequest + evidence + sacArbiter + orCondition + feeCalc + operator = 7
    expect(deployment.deployments).toHaveLength(7)
    // Some components may already exist on the forked chain — assert totals add up
    expect(deployment.summary.newCount + deployment.summary.existingCount).toBe(
      7,
    )
    // Multicall3 batches all deploys into a single tx
    expect(deployment.summary.txHashes).toHaveLength(
      deployment.summary.newCount > 0 ? 1 : 0,
    )
  })

  it('re-deploy with same options is idempotent', async () => {
    const options = makeOptions()

    const deployment = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      options,
    )

    // All should be existing since we deployed (or found existing) in the previous test
    expect(deployment.deployments).toHaveLength(7)
    expect(deployment.summary.newCount).toBe(0)
    expect(deployment.summary.existingCount).toBe(7)
    expect(deployment.summary.txHashes).toHaveLength(0)
    for (const d of deployment.deployments) {
      expect(d.isNew).toBe(false)
      expect(d.hash).toBeNull()
    }
  })

  it('deploys freeze + andCondition when freezeDurationSeconds > 0', async () => {
    const options = makeOptions({ freezeDurationSeconds: 86400n })
    const preview = await previewMarketplaceOperator(publicClient, options)
    const deployment = await deployMarketplaceOperator(
      walletClient,
      publicClient,
      options,
    )

    // freezeAddress should be non-null and valid
    expect(deployment.freezeAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(deployment.freezeAddress).toBe(preview.freezeAddress)

    // capturePreActionCondition should NOT be escrowPeriodAddress (it's the AndCondition)
    expect(deployment.operatorConfig.capturePreActionCondition).not.toBe(
      deployment.escrowPeriodAddress,
    )

    // freeze + andCondition + escrow + refundRequest + evidence + sacArbiter + orCondition + feeCalc + operator = 9
    expect(deployment.deployments).toHaveLength(9)
    expect(deployment.summary.newCount + deployment.summary.existingCount).toBe(
      9,
    )

    // Verify freeze contract's unfreezeCondition is the arbiter SAC (not a singleton)
    const unfreezeCondition = await publicClient.readContract({
      address: deployment.freezeAddress! as Address,
      abi: freezeAbi,
      functionName: 'UNFREEZE_CONDITION',
    })
    const expectedArbiterSAC = await computeStaticAddressConditionAddress(
      publicClient,
      {
        factoryAddress: baseSepolia.factories.staticAddressCondition,
        designatedAddress: options.arbiter,
      },
    )
    expect(unfreezeCondition).toBe(expectedArbiterSAC)

    // Verify freezeCondition is singletons.payer
    const freezeCondition = await publicClient.readContract({
      address: deployment.freezeAddress! as Address,
      abi: freezeAbi,
      functionName: 'FREEZE_CONDITION',
    })
    expect(freezeCondition).toBe(baseSepolia.conditions.payer)
  })

  it('deploy with different arbiter produces different operator address', async () => {
    const options1 = makeOptions()
    const options2 = makeOptions({
      arbiter: testRoles.relayer.address, // Different arbiter
    })

    const preview1 = await previewMarketplaceOperator(publicClient, options1)
    const preview2 = await previewMarketplaceOperator(publicClient, options2)

    // Different arbiter → different refundRequest → different staticAddressCondition → different operator
    expect(preview1.refundRequestAddress).not.toBe(
      preview2.refundRequestAddress,
    )
    expect(preview1.operatorAddress).not.toBe(preview2.operatorAddress)
  })
})

// ---------------------------------------------------------------------------
// Delivery Protection Operator
// ---------------------------------------------------------------------------

function makeDeliveryProtectionOptions(
  overrides: Partial<DeliveryProtectionOperatorOptions> = {},
): DeliveryProtectionOperatorOptions {
  return {
    chainId: 84532,
    arbiter: testRoles.arbiter.address,
    feeReceiver: testRoles.operatorFeeRecipient.address,
    escrowPeriodSeconds: 172800n, // 2 days — distinct from other fixtures
    ...overrides,
  }
}

describe('Deploy Delivery Protection Operator (Fork)', () => {
  let publicClient: PublicClient
  let walletClient: WalletClient

  beforeAll(async () => {
    publicClient = anvilBaseSepolia.getPublicClient()
    walletClient = anvilBaseSepolia.getWalletClient(testRoles.deployer.address)
  })

  it('previewDeliveryProtectionOperator returns valid non-zero addresses', async () => {
    const preview = await previewDeliveryProtectionOperator(
      publicClient,
      makeDeliveryProtectionOptions(),
    )

    const zero = '0x0000000000000000000000000000000000000000'
    expect(preview.operatorAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(preview.operatorAddress).not.toBe(zero)
    expect(preview.escrowPeriodAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(preview.escrowPeriodAddress).not.toBe(zero)
    expect(preview.arbiterConditionAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(preview.arbiterConditionAddress).not.toBe(zero)

    // capturePreActionCondition: OrCondition([SAC(arbiter), PayerCondition])
    expect(preview.operatorConfig.capturePreActionCondition).toBe(
      preview.releaseConditionAddress,
    )
    // voidPreActionCondition: OrCondition([EscrowPeriod, ReceiverCondition, SAC(arbiter)])
    expect(preview.operatorConfig.voidPreActionCondition).toBe(
      preview.voidConditionAddress,
    )
    // feeCalculator should be zero (no fees)
    expect(preview.operatorConfig.feeCalculator).toBe(zeroAddress)
    // authorizePreActionCondition is zeroAddress (TVL gate dropped in 0.3.0)
    expect(preview.operatorConfig.authorizePreActionCondition).toBe(zeroAddress)
    // refundPreActionCondition should be receiver singleton
    expect(preview.operatorConfig.refundPreActionCondition).toBe(
      baseSepolia.conditions!.receiver,
    )
  })

  it('deployDeliveryProtectionOperator deploys all components matching preview', async () => {
    const options = makeDeliveryProtectionOptions()

    const preview = await previewDeliveryProtectionOperator(
      publicClient,
      options,
    )
    const deployment = await deployDeliveryProtectionOperator(
      walletClient,
      publicClient,
      options,
    )

    // All deployed addresses should match previewed addresses
    expect(deployment.operatorAddress).toBe(preview.operatorAddress)
    expect(deployment.escrowPeriodAddress).toBe(preview.escrowPeriodAddress)
    expect(deployment.arbiterConditionAddress).toBe(
      preview.arbiterConditionAddress,
    )
    expect(deployment.releaseConditionAddress).toBe(
      preview.releaseConditionAddress,
    )
    expect(deployment.voidConditionAddress).toBe(preview.voidConditionAddress)
    expect(deployment.authorizeHookAddress).toBe(preview.authorizeHookAddress)

    // escrowPeriod + arbiterCondition + 2 OrConditions + hookCombinator + operator = 6
    expect(deployment.deployments).toHaveLength(6)
    expect(deployment.summary.newCount + deployment.summary.existingCount).toBe(
      6,
    )
    expect(deployment.summary.txHashes).toHaveLength(
      deployment.summary.newCount > 0 ? 1 : 0,
    )
  })

  it('re-deploy with same options is idempotent', async () => {
    const options = makeDeliveryProtectionOptions()

    const deployment = await deployDeliveryProtectionOperator(
      walletClient,
      publicClient,
      options,
    )

    expect(deployment.deployments).toHaveLength(6)
    expect(deployment.summary.newCount).toBe(0)
    expect(deployment.summary.existingCount).toBe(6)
    expect(deployment.summary.txHashes).toHaveLength(0)
    for (const d of deployment.deployments) {
      expect(d.isNew).toBe(false)
      expect(d.hash).toBeNull()
    }
  })

  it('deploy with different arbiter produces different operator address', async () => {
    const options1 = makeDeliveryProtectionOptions()
    const options2 = makeDeliveryProtectionOptions({
      arbiter: testRoles.relayer.address,
    })

    const preview1 = await previewDeliveryProtectionOperator(
      publicClient,
      options1,
    )
    const preview2 = await previewDeliveryProtectionOperator(
      publicClient,
      options2,
    )

    // Different arbiter → different arbiterCondition → different operator
    expect(preview1.arbiterConditionAddress).not.toBe(
      preview2.arbiterConditionAddress,
    )
    expect(preview1.operatorAddress).not.toBe(preview2.operatorAddress)
  })
})
