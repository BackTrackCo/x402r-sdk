import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import { encodeFunctionData, pad, zeroAddress } from 'viem'
import {
  andConditionFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  orConditionFactoryAbi,
  paymentOperatorFactoryAbi,
  signatureConditionFactoryAbi,
  signatureRefundRequestFactoryAbi,
  staticFeeCalculatorFactoryAbi,
} from '../abis/generated.js'
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
} from './factories.js'
import type { DeployResult } from './factory-helpers.js'

// ---------------------------------------------------------------------------
// Multicall3 (deployed at same address on all EVM chains)
// ---------------------------------------------------------------------------

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11' as const

const multicall3Abi = [
  {
    type: 'function' as const,
    name: 'aggregate3' as const,
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]' as const,
        components: [
          { name: 'target', type: 'address' as const },
          { name: 'allowFailure', type: 'bool' as const },
          { name: 'callData', type: 'bytes' as const },
        ],
      },
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]' as const,
        components: [
          { name: 'success', type: 'bool' as const },
          { name: 'returnData', type: 'bytes' as const },
        ],
      },
    ],
    stateMutability: 'payable' as const,
  },
] as const

type Multicall3Call = { target: Address; allowFailure: boolean; callData: Hex }

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
// deployMarketplaceOperator — single-tx via Multicall3
//
// 1. Compute all deterministic addresses (read-only via preview)
// 2. Batch-check which contracts already exist (getDeployed != zeroAddress)
// 3. If operator exists, return immediately — no transaction needed
// 4. Deploy only missing contracts in one Multicall3.aggregate3 transaction
// ---------------------------------------------------------------------------

export async function deployMarketplaceOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: MarketplaceOperatorOptions,
): Promise<MarketplaceOperatorDeployment> {
  const {
    factories,
    singletons,
    authorizedCodehash,
    freezeDurationSeconds,
    operatorFeeBps,
  } = resolveOptions(options)

  // ── Phase 1: Compute all deterministic addresses ───────────────────────
  const preview = await previewMarketplaceOperator(publicClient, options)
  const {
    escrowPeriodAddress,
    signatureConditionAddress,
    feeCalculatorAddress,
    freezeAddress,
    refundInEscrowConditionAddress,
    signatureRefundRequestAddress,
    operatorAddress,
    operatorConfig,
  } = preview

  const hasFee = operatorFeeBps > 0n
  const hasFreeze = freezeDurationSeconds > 0n

  // ── Phase 2: Batch-check which contracts already exist ─────────────────
  const escrowArgs = [options.escrowPeriodSeconds, authorizedCodehash] as const
  const sigCondArgs = [options.arbiter] as const
  const orCondArgs = [[singletons.receiver, signatureConditionAddress]] as const
  const sigRefundArgs = [signatureConditionAddress] as const
  const freezeArgs = hasFreeze
    ? ([
        singletons.payer,
        singletons.receiver,
        freezeDurationSeconds,
        escrowPeriodAddress,
      ] as const)
    : null
  const andCondArgs =
    hasFreeze && freezeAddress
      ? ([[escrowPeriodAddress, freezeAddress]] as const)
      : null

  type MulticallContract = {
    address: Address
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
  }

  const existenceContracts: MulticallContract[] = [
    {
      address: factories.escrowPeriod,
      abi: escrowPeriodFactoryAbi,
      functionName: 'getDeployed',
      args: escrowArgs,
    },
    {
      address: factories.signatureCondition,
      abi: signatureConditionFactoryAbi,
      functionName: 'getDeployed',
      args: sigCondArgs,
    },
    {
      address: factories.orCondition,
      abi: orConditionFactoryAbi,
      functionName: 'getDeployed',
      args: orCondArgs,
    },
    {
      address: factories.signatureRefundRequest,
      abi: signatureRefundRequestFactoryAbi,
      functionName: 'getDeployed',
      args: sigRefundArgs,
    },
    {
      address: factories.paymentOperator,
      abi: paymentOperatorFactoryAbi,
      functionName: 'getOperator',
      args: [operatorConfig],
    },
  ]

  if (hasFreeze && freezeArgs) {
    existenceContracts.push({
      address: factories.freeze,
      abi: freezeFactoryAbi,
      functionName: 'getDeployed',
      args: freezeArgs,
    })
  }
  if (andCondArgs) {
    existenceContracts.push({
      address: factories.andCondition,
      abi: andConditionFactoryAbi,
      functionName: 'getDeployed',
      args: andCondArgs,
    })
  }
  if (hasFee) {
    existenceContracts.push({
      address: factories.staticFeeCalculator,
      abi: staticFeeCalculatorFactoryAbi,
      functionName: 'getDeployed',
      args: [operatorFeeBps],
    })
  }

  const existenceResults = await publicClient.multicall({
    contracts: existenceContracts as Parameters<
      typeof publicClient.multicall
    >[0]['contracts'],
  })

  const exists = {
    escrowPeriod: existenceResults[0].result !== zeroAddress,
    signatureCondition: existenceResults[1].result !== zeroAddress,
    orCondition: existenceResults[2].result !== zeroAddress,
    signatureRefundRequest: existenceResults[3].result !== zeroAddress,
    operator: existenceResults[4].result !== zeroAddress,
    freeze: false,
    andCondition: false,
    feeCalculator: !hasFee, // treat as "existing" if not needed
  }
  let idx = 5
  if (hasFreeze && freezeArgs) {
    exists.freeze = existenceResults[idx++].result !== zeroAddress
  }
  if (andCondArgs) {
    exists.andCondition = existenceResults[idx++].result !== zeroAddress
  }
  if (hasFee) {
    exists.feeCalculator = existenceResults[idx++].result !== zeroAddress
  }

  // If operator already deployed, return immediately
  if (exists.operator) {
    const existingDeployments: DeployResult[] = [
      { address: escrowPeriodAddress, hash: null, isNew: false },
      { address: signatureConditionAddress, hash: null, isNew: false },
      { address: refundInEscrowConditionAddress, hash: null, isNew: false },
      { address: signatureRefundRequestAddress, hash: null, isNew: false },
    ]
    if (hasFreeze && freezeAddress) {
      existingDeployments.push({
        address: freezeAddress,
        hash: null,
        isNew: false,
      })
      existingDeployments.push({
        address: preview.operatorConfig.releaseCondition,
        hash: null,
        isNew: false,
      })
    }
    if (hasFee && feeCalculatorAddress) {
      existingDeployments.push({
        address: feeCalculatorAddress,
        hash: null,
        isNew: false,
      })
    }
    existingDeployments.push({
      address: operatorAddress,
      hash: null,
      isNew: false,
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
      deployments: existingDeployments,
      summary: {
        newCount: 0,
        existingCount: existingDeployments.length,
        txHashes: [],
      },
    }
  }

  // ── Phase 3: Build deploy calls for missing contracts ──────────────────
  const calls: Multicall3Call[] = []
  const deployments: DeployResult[] = []

  function trackDeploy(
    address: Address,
    isExisting: boolean,
    factory: Address,
    abi: readonly unknown[],
    functionName: string,
    args: readonly unknown[],
  ) {
    if (isExisting) {
      deployments.push({ address, hash: null, isNew: false })
    } else {
      calls.push({
        target: factory,
        allowFailure: true,
        callData: encodeFunctionData({ abi, functionName, args }),
      })
      // hash will be filled in after the multicall tx
      deployments.push({ address, hash: null, isNew: true })
    }
  }

  trackDeploy(
    escrowPeriodAddress,
    exists.escrowPeriod,
    factories.escrowPeriod,
    escrowPeriodFactoryAbi,
    'deploy',
    escrowArgs,
  )
  trackDeploy(
    signatureConditionAddress,
    exists.signatureCondition,
    factories.signatureCondition,
    signatureConditionFactoryAbi,
    'deploy',
    sigCondArgs,
  )
  trackDeploy(
    refundInEscrowConditionAddress,
    exists.orCondition,
    factories.orCondition,
    orConditionFactoryAbi,
    'deploy',
    orCondArgs,
  )
  trackDeploy(
    signatureRefundRequestAddress,
    exists.signatureRefundRequest,
    factories.signatureRefundRequest,
    signatureRefundRequestFactoryAbi,
    'deploy',
    sigRefundArgs,
  )
  if (hasFreeze && freezeArgs && freezeAddress) {
    trackDeploy(
      freezeAddress,
      exists.freeze,
      factories.freeze,
      freezeFactoryAbi,
      'deploy',
      freezeArgs,
    )
  }
  if (
    andCondArgs &&
    preview.operatorConfig.releaseCondition !== escrowPeriodAddress
  ) {
    trackDeploy(
      preview.operatorConfig.releaseCondition,
      exists.andCondition,
      factories.andCondition,
      andConditionFactoryAbi,
      'deploy',
      andCondArgs,
    )
  }
  if (hasFee) {
    trackDeploy(
      feeCalculatorAddress!,
      exists.feeCalculator,
      factories.staticFeeCalculator,
      staticFeeCalculatorFactoryAbi,
      'deploy',
      [operatorFeeBps],
    )
  }

  // Operator deploy is always included (we checked it doesn't exist above)
  calls.push({
    target: factories.paymentOperator,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: paymentOperatorFactoryAbi,
      functionName: 'deployOperator',
      args: [operatorConfig],
    }),
  })
  deployments.push({ address: operatorAddress, hash: null, isNew: true })

  // ── Phase 4: Send single transaction via Multicall3.aggregate3 ─────────
  if (!walletClient.account) {
    throw new ConfigError('walletClient.account is required for deployment')
  }

  const { request } = await publicClient.simulateContract({
    address: MULTICALL3,
    abi: multicall3Abi,
    functionName: 'aggregate3',
    args: [calls],
    account: walletClient.account,
  })
  const txHash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  // Fill in txHash for all new deployments
  for (const d of deployments) {
    if (d.isNew) d.hash = txHash
  }

  const newCount = deployments.filter((d) => d.isNew).length
  const existingCount = deployments.filter((d) => !d.isNew).length

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
    summary: { newCount, existingCount, txHashes: [txHash] },
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
// deployArbiterSetup — single-tx via Multicall3
// ---------------------------------------------------------------------------

export async function deployArbiterSetup(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: ArbiterSetupOptions,
): Promise<ArbiterSetupDeployment> {
  const factories = getFactoryAddresses(options.chainId)

  // Phase 1: Compute deterministic addresses
  const preview = await previewArbiterSetup(publicClient, options)
  const { signatureConditionAddress, signatureRefundRequestAddress } = preview

  // Phase 2: Batch-check existence
  const existenceResults = await publicClient.multicall({
    contracts: [
      {
        address: factories.signatureCondition,
        abi: signatureConditionFactoryAbi,
        functionName: 'getDeployed',
        args: [options.arbiter],
      },
      {
        address: factories.signatureRefundRequest,
        abi: signatureRefundRequestFactoryAbi,
        functionName: 'getDeployed',
        args: [signatureConditionAddress],
      },
    ] as Parameters<typeof publicClient.multicall>[0]['contracts'],
  })

  const sigCondExists = existenceResults[0].result !== zeroAddress
  const sigRefundExists = existenceResults[1].result !== zeroAddress

  // If both already exist, return immediately
  if (sigCondExists && sigRefundExists) {
    return {
      signatureConditionAddress,
      signatureRefundRequestAddress,
      deployments: [
        { address: signatureConditionAddress, hash: null, isNew: false },
        { address: signatureRefundRequestAddress, hash: null, isNew: false },
      ],
      summary: { newCount: 0, existingCount: 2, txHashes: [] },
    }
  }

  // Phase 3: Build deploy calls for missing contracts
  const calls: Multicall3Call[] = []
  const deployments: DeployResult[] = []

  if (sigCondExists) {
    deployments.push({
      address: signatureConditionAddress,
      hash: null,
      isNew: false,
    })
  } else {
    calls.push({
      target: factories.signatureCondition,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: signatureConditionFactoryAbi,
        functionName: 'deploy',
        args: [options.arbiter],
      }),
    })
    deployments.push({
      address: signatureConditionAddress,
      hash: null,
      isNew: true,
    })
  }

  if (sigRefundExists) {
    deployments.push({
      address: signatureRefundRequestAddress,
      hash: null,
      isNew: false,
    })
  } else {
    calls.push({
      target: factories.signatureRefundRequest,
      allowFailure: false,
      callData: encodeFunctionData({
        abi: signatureRefundRequestFactoryAbi,
        functionName: 'deploy',
        args: [signatureConditionAddress],
      }),
    })
    deployments.push({
      address: signatureRefundRequestAddress,
      hash: null,
      isNew: true,
    })
  }

  // Phase 4: Send single transaction via Multicall3.aggregate3
  if (!walletClient.account) {
    throw new ConfigError('walletClient.account is required for deployment')
  }

  const { request } = await publicClient.simulateContract({
    address: MULTICALL3,
    abi: multicall3Abi,
    functionName: 'aggregate3',
    args: [calls],
    account: walletClient.account,
  })
  const txHash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  for (const d of deployments) {
    if (d.isNew) d.hash = txHash
  }

  const newCount = deployments.filter((d) => d.isNew).length
  const existingCount = deployments.filter((d) => !d.isNew).length

  return {
    signatureConditionAddress,
    signatureRefundRequestAddress,
    deployments,
    summary: { newCount, existingCount, txHashes: [txHash] },
  }
}
