import type { Address, PublicClient, WalletClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { freezeAbi } from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import {
  computeFeeCalculatorAddress,
  computeStaticAddressConditionAddress,
  deployMarketplaceOperator,
  type MarketplaceOperatorOptions,
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
    feeRecipient: testRoles.operatorFeeRecipient.address,
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
    expect(preview.refundInEscrowConditionAddress).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    )
    expect(preview.feeCalculatorAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)

    // All addresses should be non-zero
    const zero = '0x0000000000000000000000000000000000000000'
    expect(preview.operatorAddress).not.toBe(zero)
    expect(preview.escrowPeriodAddress).not.toBe(zero)
    // freezeAddress is null (no freeze configured), skip zero-check
    expect(preview.refundRequestAddress).not.toBe(zero)
    expect(preview.refundInEscrowConditionAddress).not.toBe(zero)
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
    expect(deployment.refundInEscrowConditionAddress).toBe(
      preview.refundInEscrowConditionAddress,
    )
    expect(deployment.feeCalculatorAddress).toBe(preview.feeCalculatorAddress)

    // Evidence contract deployed and has bytecode
    expect(deployment.refundRequestEvidenceAddress).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    )
    const evidenceCode = await publicClient.getCode({
      address: deployment.refundRequestEvidenceAddress as Address,
    })
    expect(evidenceCode).not.toBe('0x')

    // No freeze, with fee: escrow + refundRequest + evidence + feeCalc + operator = 5
    // (no SAC(refundRequest) — refundInEscrow uses ReceiverCondition singleton)
    expect(deployment.deployments).toHaveLength(5)
    // Some components may already exist on the forked chain — assert totals add up
    expect(deployment.summary.newCount + deployment.summary.existingCount).toBe(
      5,
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
    expect(deployment.deployments).toHaveLength(5)
    expect(deployment.summary.newCount).toBe(0)
    expect(deployment.summary.existingCount).toBe(5)
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

    // releaseCondition should NOT be escrowPeriodAddress (it's the AndCondition)
    expect(deployment.operatorConfig.releaseCondition).not.toBe(
      deployment.escrowPeriodAddress,
    )

    // freeze + andCondition + escrow + refundRequest + evidence + staticAddrCondArbiter + feeCalc + operator = 8
    // (no SAC(refundRequest) — refundInEscrow uses ReceiverCondition singleton)
    expect(deployment.deployments).toHaveLength(8)
    expect(deployment.summary.newCount + deployment.summary.existingCount).toBe(
      8,
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
