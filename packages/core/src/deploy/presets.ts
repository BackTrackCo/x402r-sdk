import type { Address, Hash, Hex, PublicClient, WalletClient } from 'viem'
import { pad, zeroAddress } from 'viem'
import {
  getChainConfig,
  getConditionSingletons,
  getFactoryAddresses,
} from '../config/index.js'
import { ConfigError } from '../errors/index.js'
import type { OperatorConfig } from '../types/index.js'
import {
  computeAndConditionAddress,
  computeEscrowPeriodAddress,
  computeFeeCalculatorAddress,
  computeFreezeAddress,
  computeOperatorAddress,
  computeOrConditionAddress,
  computeSignatureConditionAddress,
  computeSignatureRefundRequestAddress,
  deployAndCondition,
  deployEscrowPeriod,
  deployFeeCalculator,
  deployFreeze,
  deployOperator,
  deployOrCondition,
  deploySignatureCondition,
  deploySignatureRefundRequest,
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
  freezeAddress: Address | null
  signatureConditionAddress: Address
  refundInEscrowConditionAddress: Address
  signatureRefundRequestAddress: Address
  feeCalculatorAddress: Address | null
  operatorConfig: OperatorConfig
}

export interface MarketplaceOperatorDeployment {
  operatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address | null
  signatureConditionAddress: Address
  refundInEscrowConditionAddress: Address
  signatureRefundRequestAddress: Address
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
  // bytes32(0) = no authorized codehash restriction (operator-only recording)
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

  // Batch 1 (parallel): independent computations
  const [escrowPeriodAddress, signatureConditionAddress, feeCalculatorAddress] =
    await Promise.all([
      computeEscrowPeriodAddress(publicClient, {
        factoryAddress: factories.escrowPeriod,
        escrowPeriod: options.escrowPeriodSeconds,
        authorizedCodehash,
      }),
      computeSignatureConditionAddress(publicClient, {
        factoryAddress: factories.signatureCondition,
        signer: options.arbiter,
      }),
      operatorFeeBps > 0n
        ? computeFeeCalculatorAddress(publicClient, {
            factoryAddress: factories.staticFeeCalculator,
            feeBps: operatorFeeBps,
          })
        : Promise.resolve(null),
    ])

  // Batch 2 (parallel): depends on batch 1 results
  const [
    freezeAddress,
    refundInEscrowConditionAddress,
    signatureRefundRequestAddress,
  ] = await Promise.all([
    freezeDurationSeconds > 0n
      ? computeFreezeAddress(publicClient, {
          factoryAddress: factories.freeze,
          freezeCondition: singletons.payer,
          unfreezeCondition: singletons.receiver,
          freezeDuration: freezeDurationSeconds,
          escrowPeriodContract: escrowPeriodAddress,
        })
      : Promise.resolve(null),
    computeOrConditionAddress(publicClient, {
      factoryAddress: factories.orCondition,
      conditions: [singletons.receiver, signatureConditionAddress],
    }),
    computeSignatureRefundRequestAddress(publicClient, {
      factoryAddress: factories.signatureRefundRequest,
      signatureCondition: signatureConditionAddress,
    }),
  ])

  // Batch 3: andCondition (only when freeze enabled, depends on batch 2)
  let releaseConditionAddress: Address = escrowPeriodAddress
  if (freezeDurationSeconds > 0n && freezeAddress) {
    releaseConditionAddress = await computeAndConditionAddress(publicClient, {
      factoryAddress: factories.andCondition,
      conditions: [escrowPeriodAddress, freezeAddress],
    })
  }

  // Batch 4: operator (depends on everything)
  const operatorConfig: OperatorConfig = {
    feeRecipient: options.feeRecipient,
    feeCalculator: feeCalculatorAddress ?? zeroAddress,
    authorizeCondition: config.usdcTvlLimit,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: releaseConditionAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: refundInEscrowConditionAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: singletons.receiver,
    refundPostEscrowRecorder: zeroAddress,
  }

  const operatorAddress = await computeOperatorAddress(publicClient, {
    factoryAddress: factories.paymentOperator,
    config: operatorConfig,
  })

  return {
    operatorAddress,
    escrowPeriodAddress,
    freezeAddress,
    signatureConditionAddress,
    refundInEscrowConditionAddress,
    signatureRefundRequestAddress,
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

  // Batch 1 (parallel): independent deployments
  const [escrowResult, signatureConditionResult, feeResult] = await Promise.all(
    [
      deployEscrowPeriod(walletClient, publicClient, {
        factoryAddress: factories.escrowPeriod,
        escrowPeriod: options.escrowPeriodSeconds,
        authorizedCodehash,
      }),
      deploySignatureCondition(walletClient, publicClient, {
        factoryAddress: factories.signatureCondition,
        signer: options.arbiter,
      }),
      operatorFeeBps > 0n
        ? deployFeeCalculator(walletClient, publicClient, {
            factoryAddress: factories.staticFeeCalculator,
            feeBps: operatorFeeBps,
          })
        : Promise.resolve(null),
    ],
  )
  deployments.push(escrowResult, signatureConditionResult)
  if (feeResult) deployments.push(feeResult)
  const escrowPeriodAddress = escrowResult.address
  const signatureConditionAddress = signatureConditionResult.address
  const feeCalculatorAddress = feeResult?.address ?? null

  // Batch 2 (parallel): depends on batch 1
  const [freezeResult, refundInEscrowResult, signatureRefundRequestResult] =
    await Promise.all([
      freezeDurationSeconds > 0n
        ? deployFreeze(walletClient, publicClient, {
            factoryAddress: factories.freeze,
            freezeCondition: singletons.payer,
            unfreezeCondition: singletons.receiver,
            freezeDuration: freezeDurationSeconds,
            escrowPeriodContract: escrowPeriodAddress,
          })
        : Promise.resolve(null),
      deployOrCondition(walletClient, publicClient, {
        factoryAddress: factories.orCondition,
        conditions: [singletons.receiver, signatureConditionAddress],
      }),
      deploySignatureRefundRequest(walletClient, publicClient, {
        factoryAddress: factories.signatureRefundRequest,
        signatureCondition: signatureConditionAddress,
      }),
    ])
  if (freezeResult) deployments.push(freezeResult)
  deployments.push(refundInEscrowResult, signatureRefundRequestResult)
  const freezeAddress = freezeResult?.address ?? null
  const refundInEscrowConditionAddress = refundInEscrowResult.address
  const signatureRefundRequestAddress = signatureRefundRequestResult.address

  // Batch 3: andCondition (only when freeze enabled, depends on batch 2)
  let releaseConditionAddress: Address = escrowPeriodAddress
  if (freezeDurationSeconds > 0n && freezeResult) {
    const andResult = await deployAndCondition(walletClient, publicClient, {
      factoryAddress: factories.andCondition,
      conditions: [escrowPeriodAddress, freezeAddress!],
    })
    deployments.push(andResult)
    releaseConditionAddress = andResult.address
  }

  // Batch 4: operator (depends on everything)
  const operatorConfig: OperatorConfig = {
    feeRecipient: options.feeRecipient,
    feeCalculator: feeCalculatorAddress ?? zeroAddress,
    authorizeCondition: config.usdcTvlLimit,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: releaseConditionAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: refundInEscrowConditionAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: singletons.receiver,
    refundPostEscrowRecorder: zeroAddress,
  }

  const operatorResult = await deployOperator(walletClient, publicClient, {
    factoryAddress: factories.paymentOperator,
    config: operatorConfig,
  })
  deployments.push(operatorResult)
  const operatorAddress = operatorResult.address

  // Build summary
  const newCount = deployments.filter((d) => d.isNew).length
  const existingCount = deployments.filter((d) => !d.isNew).length
  const txHashes = deployments
    .map((d) => d.hash)
    .filter((h): h is Hash => h !== null)

  return {
    operatorAddress,
    escrowPeriodAddress,
    freezeAddress,
    signatureConditionAddress,
    refundInEscrowConditionAddress,
    signatureRefundRequestAddress,
    feeCalculatorAddress,
    operatorConfig,
    deployments,
    summary: { newCount, existingCount, txHashes },
  }
}

// ---------------------------------------------------------------------------
// Arbiter setup types
// ---------------------------------------------------------------------------

export interface ArbiterSetupOptions {
  chainId: number
  arbiter: Address
}

export interface ArbiterSetupPreview {
  signatureConditionAddress: Address
  signatureRefundRequestAddress: Address
}

export interface ArbiterSetupDeployment {
  signatureConditionAddress: Address
  signatureRefundRequestAddress: Address
  deployments: DeployResult[]
  summary: {
    newCount: number
    existingCount: number
    txHashes: `0x${string}`[]
  }
}

// ---------------------------------------------------------------------------
// previewArbiterSetup — read-only address computation
// ---------------------------------------------------------------------------

export async function previewArbiterSetup(
  publicClient: PublicClient,
  options: ArbiterSetupOptions,
): Promise<ArbiterSetupPreview> {
  const factories = getFactoryAddresses(options.chainId)

  const signatureConditionAddress = await computeSignatureConditionAddress(
    publicClient,
    {
      factoryAddress: factories.signatureCondition,
      signer: options.arbiter,
    },
  )

  const signatureRefundRequestAddress =
    await computeSignatureRefundRequestAddress(publicClient, {
      factoryAddress: factories.signatureRefundRequest,
      signatureCondition: signatureConditionAddress,
    })

  return {
    signatureConditionAddress,
    signatureRefundRequestAddress,
  }
}

// ---------------------------------------------------------------------------
// deployArbiterSetup — deploy SignatureCondition + SignatureRefundRequest
// ---------------------------------------------------------------------------

export async function deployArbiterSetup(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: ArbiterSetupOptions,
): Promise<ArbiterSetupDeployment> {
  const factories = getFactoryAddresses(options.chainId)
  const deployments: DeployResult[] = []

  // 1. SignatureCondition(arbiter)
  const signatureConditionResult = await deploySignatureCondition(
    walletClient,
    publicClient,
    {
      factoryAddress: factories.signatureCondition,
      signer: options.arbiter,
    },
  )
  deployments.push(signatureConditionResult)
  const signatureConditionAddress = signatureConditionResult.address

  // 2. SignatureRefundRequest(signatureCondition)
  const signatureRefundRequestResult = await deploySignatureRefundRequest(
    walletClient,
    publicClient,
    {
      factoryAddress: factories.signatureRefundRequest,
      signatureCondition: signatureConditionAddress,
    },
  )
  deployments.push(signatureRefundRequestResult)

  const newCount = deployments.filter((d) => d.isNew).length
  const existingCount = deployments.filter((d) => !d.isNew).length
  const txHashes = deployments
    .map((d) => d.hash)
    .filter((h): h is Hash => h !== null)

  return {
    signatureConditionAddress,
    signatureRefundRequestAddress: signatureRefundRequestResult.address,
    deployments,
    summary: { newCount, existingCount, txHashes },
  }
}
