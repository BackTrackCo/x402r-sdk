import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import { pad, zeroAddress } from 'viem'
import {
  getChainConfig,
  getConditionSingletons,
  getFactoryAddresses,
} from '../config/index.js'
import { ConfigError } from '../errors/index.js'
import type { OperatorConfig } from '../types/index.js'
import {
  computeEscrowPeriodAddress,
  computeFeeCalculatorAddress,
  computeFreezeAddress,
  computeOperatorAddress,
  computeOrConditionAddress,
  computeStaticAddressConditionAddress,
  deployEscrowPeriod,
  deployFeeCalculator,
  deployFreeze,
  deployOperator,
  deployOrCondition,
  deployStaticAddressCondition,
} from './factories.js'
import type { DeployResult } from './factory-helpers.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketplaceOperatorOptions {
  chainId: number
  feeRecipient: Address
  arbiter: Address
  escrowPeriodSeconds: bigint
  freezeDurationSeconds?: bigint
  operatorFeeBps?: bigint
  authorizedCodehash?: Hex
}

export interface MarketplaceOperatorPreview {
  operatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address
  arbiterConditionAddress: Address
  refundInEscrowConditionAddress: Address
  feeCalculatorAddress: Address | null
  operatorConfig: OperatorConfig
}

export interface MarketplaceOperatorDeployment {
  operatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address
  arbiterConditionAddress: Address
  refundInEscrowConditionAddress: Address
  feeCalculatorAddress: Address | null
  operatorConfig: OperatorConfig
  deployments: DeployResult[]
  summary: {
    newCount: number
    existingCount: number
    txHashes: `0x${string}`[]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveOptions(options: MarketplaceOperatorOptions) {
  const config = getChainConfig(options.chainId)
  if (!config.factories) {
    throw new ConfigError(
      `Factories are not deployed on ${config.name} (chainId: ${options.chainId})`,
    )
  }
  if (!config.conditions) {
    throw new ConfigError(
      `Condition singletons are not deployed on ${config.name} (chainId: ${options.chainId})`,
    )
  }

  const factories = getFactoryAddresses(options.chainId)
  const singletons = getConditionSingletons(options.chainId)
  const authorizedCodehash = options.authorizedCodehash ?? pad('0x00')
  const freezeDurationSeconds = options.freezeDurationSeconds ?? 0n
  const operatorFeeBps = options.operatorFeeBps ?? 0n

  return {
    config,
    factories,
    singletons,
    authorizedCodehash,
    freezeDurationSeconds,
    operatorFeeBps,
  }
}

// ---------------------------------------------------------------------------
// previewMarketplaceOperator — read-only address computation
// ---------------------------------------------------------------------------

export async function previewMarketplaceOperator(
  publicClient: PublicClient,
  options: MarketplaceOperatorOptions,
): Promise<MarketplaceOperatorPreview> {
  const {
    config,
    factories,
    singletons,
    authorizedCodehash,
    freezeDurationSeconds,
    operatorFeeBps,
  } = resolveOptions(options)

  // 1. EscrowPeriod
  const escrowPeriodAddress = await computeEscrowPeriodAddress(
    publicClient,
    factories.escrowPeriod,
    options.escrowPeriodSeconds,
    authorizedCodehash,
  )

  // 2. Freeze (payer freezes, receiver unfreezes)
  const freezeAddress = await computeFreezeAddress(
    publicClient,
    factories.freeze,
    singletons.payer,
    singletons.receiver,
    freezeDurationSeconds,
    escrowPeriodAddress,
  )

  // 3. Arbiter StaticAddressCondition
  const arbiterConditionAddress = await computeStaticAddressConditionAddress(
    publicClient,
    factories.staticAddressCondition,
    options.arbiter,
  )

  // 4. RefundInEscrow: OR(receiver singleton, arbiter condition)
  const refundInEscrowConditionAddress = await computeOrConditionAddress(
    publicClient,
    factories.orCondition,
    [singletons.receiver, arbiterConditionAddress],
  )

  // 5. FeeCalculator (only if operatorFeeBps > 0)
  const feeCalculatorAddress =
    operatorFeeBps > 0n
      ? await computeFeeCalculatorAddress(
          publicClient,
          factories.staticFeeCalculator,
          operatorFeeBps,
        )
      : null

  // 6. Build OperatorConfig
  const operatorConfig: OperatorConfig = {
    feeRecipient: options.feeRecipient,
    feeCalculator: feeCalculatorAddress ?? zeroAddress,
    authorizeCondition: config.usdcTvlLimit,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: escrowPeriodAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: refundInEscrowConditionAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: singletons.receiver,
    refundPostEscrowRecorder: zeroAddress,
  }

  // 7. Compute operator address
  const operatorAddress = await computeOperatorAddress(
    publicClient,
    factories.paymentOperator,
    operatorConfig,
  )

  return {
    operatorAddress,
    escrowPeriodAddress,
    freezeAddress,
    arbiterConditionAddress,
    refundInEscrowConditionAddress,
    feeCalculatorAddress,
    operatorConfig,
  }
}

// ---------------------------------------------------------------------------
// deployMarketplaceOperator — deploy all components
// ---------------------------------------------------------------------------

export async function deployMarketplaceOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: MarketplaceOperatorOptions,
): Promise<MarketplaceOperatorDeployment> {
  const {
    config,
    factories,
    singletons,
    authorizedCodehash,
    freezeDurationSeconds,
    operatorFeeBps,
  } = resolveOptions(options)

  const deployments: DeployResult[] = []

  // 1. EscrowPeriod
  const escrowResult = await deployEscrowPeriod(
    walletClient,
    publicClient,
    factories.escrowPeriod,
    options.escrowPeriodSeconds,
    authorizedCodehash,
  )
  deployments.push(escrowResult)
  const escrowPeriodAddress = escrowResult.address

  // 2. Freeze (payer freezes, receiver unfreezes)
  const freezeResult = await deployFreeze(
    walletClient,
    publicClient,
    factories.freeze,
    singletons.payer,
    singletons.receiver,
    freezeDurationSeconds,
    escrowPeriodAddress,
  )
  deployments.push(freezeResult)
  const freezeAddress = freezeResult.address

  // 3. Arbiter StaticAddressCondition
  const arbiterResult = await deployStaticAddressCondition(
    walletClient,
    publicClient,
    factories.staticAddressCondition,
    options.arbiter,
  )
  deployments.push(arbiterResult)
  const arbiterConditionAddress = arbiterResult.address

  // 4. RefundInEscrow: OR(receiver singleton, arbiter condition)
  const refundInEscrowResult = await deployOrCondition(
    walletClient,
    publicClient,
    factories.orCondition,
    [singletons.receiver, arbiterConditionAddress],
  )
  deployments.push(refundInEscrowResult)
  const refundInEscrowConditionAddress = refundInEscrowResult.address

  // 5. FeeCalculator (only if operatorFeeBps > 0)
  let feeCalculatorAddress: Address | null = null
  if (operatorFeeBps > 0n) {
    const feeResult = await deployFeeCalculator(
      walletClient,
      publicClient,
      factories.staticFeeCalculator,
      operatorFeeBps,
    )
    deployments.push(feeResult)
    feeCalculatorAddress = feeResult.address
  }

  // 6. Build OperatorConfig
  const operatorConfig: OperatorConfig = {
    feeRecipient: options.feeRecipient,
    feeCalculator: feeCalculatorAddress ?? zeroAddress,
    authorizeCondition: config.usdcTvlLimit,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: escrowPeriodAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: refundInEscrowConditionAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: singletons.receiver,
    refundPostEscrowRecorder: zeroAddress,
  }

  // 7. Deploy PaymentOperator
  const operatorResult = await deployOperator(
    walletClient,
    publicClient,
    factories.paymentOperator,
    operatorConfig,
  )
  deployments.push(operatorResult)
  const operatorAddress = operatorResult.address

  // Build summary
  const newCount = deployments.filter((d) => d.isNew).length
  const existingCount = deployments.filter((d) => !d.isNew).length
  const txHashes = deployments
    .filter((d) => d.hash !== null)
    .map((d) => d.hash!)

  return {
    operatorAddress,
    escrowPeriodAddress,
    freezeAddress,
    arbiterConditionAddress,
    refundInEscrowConditionAddress,
    feeCalculatorAddress,
    operatorConfig,
    deployments,
    summary: { newCount, existingCount, txHashes },
  }
}
