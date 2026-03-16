import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import { encodeFunctionData, pad, zeroAddress } from 'viem'
import {
  andConditionFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  paymentOperatorFactoryAbi,
  refundRequestFactoryAbi,
  signatureConditionFactoryAbi,
  staticAddressConditionFactoryAbi,
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
  computeRefundRequestAddress,
  computeSignatureConditionAddress,
  computeStaticAddressConditionAddress,
} from './factories.js'
import type { DeployResult } from './factory-helpers.js'

// ---------------------------------------------------------------------------
// Multicall3 (deployed at same address on all EVM chains)
// ---------------------------------------------------------------------------

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11' as const

// Custom ABI instead of viem's multicall3Abi because viem declares aggregate3
// as `stateMutability: 'view'` (it only uses multicall for reads). We need
// `'payable'` here since we're batching state-changing factory deploys.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Multicall3Call = { target: Address; allowFailure: boolean; callData: Hex }

type MulticallContract = {
  address: Address
  abi: readonly unknown[]
  functionName: string
  args?: readonly unknown[]
}

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
  refundRequestAddress: Address
  refundInEscrowConditionAddress: Address
  feeCalculatorAddress: Address | null
  operatorConfig: OperatorConfig
}

export interface MarketplaceOperatorDeployment {
  operatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address | null
  refundRequestAddress: Address
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
  /* v8 ignore start -- defensive: all current chains have factories & conditions */
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
  /* v8 ignore stop */

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
  const [escrowPeriodAddress, refundRequestAddress, feeCalculatorAddress] =
    await Promise.all([
      computeEscrowPeriodAddress(publicClient, {
        factoryAddress: factories.escrowPeriod,
        escrowPeriod: options.escrowPeriodSeconds,
        authorizedCodehash,
      }),
      computeRefundRequestAddress(publicClient, {
        factoryAddress: factories.refundRequest,
        arbiter: options.arbiter,
      }),
      operatorFeeBps > 0n
        ? computeFeeCalculatorAddress(publicClient, {
            factoryAddress: factories.staticFeeCalculator,
            feeBps: operatorFeeBps,
          })
        : Promise.resolve(null),
    ])

  // Batch 2 (parallel): depends on batch 1 results
  const [freezeAddress, refundInEscrowConditionAddress] = await Promise.all([
    freezeDurationSeconds > 0n
      ? computeFreezeAddress(publicClient, {
          factoryAddress: factories.freeze,
          freezeCondition: singletons.payer,
          unfreezeCondition: singletons.receiver,
          freezeDuration: freezeDurationSeconds,
          escrowPeriodContract: escrowPeriodAddress,
        })
      : Promise.resolve(null),
    computeStaticAddressConditionAddress(publicClient, {
      factoryAddress: factories.staticAddressCondition,
      designatedAddress: refundRequestAddress,
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
    refundRequestAddress,
    refundInEscrowConditionAddress,
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
    feeCalculatorAddress,
    freezeAddress,
    refundRequestAddress,
    refundInEscrowConditionAddress,
    operatorAddress,
    operatorConfig,
  } = preview

  const hasFee = operatorFeeBps > 0n
  const hasFreeze = freezeDurationSeconds > 0n

  // ── Phase 2: Batch-check which contracts already exist ─────────────────
  const escrowArgs = [options.escrowPeriodSeconds, authorizedCodehash] as const
  const refundRequestArgs = [options.arbiter] as const
  const staticAddrCondArgs = [refundRequestAddress] as const
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

  // Named entries so results are keyed by name, not brittle array indices
  const existenceEntries: { name: string; contract: MulticallContract }[] = [
    {
      name: 'escrowPeriod',
      contract: {
        address: factories.escrowPeriod,
        abi: escrowPeriodFactoryAbi,
        functionName: 'getDeployed',
        args: escrowArgs,
      },
    },
    {
      name: 'refundRequest',
      contract: {
        address: factories.refundRequest,
        abi: refundRequestFactoryAbi,
        functionName: 'getDeployed',
        args: refundRequestArgs,
      },
    },
    {
      name: 'staticAddressCondition',
      contract: {
        address: factories.staticAddressCondition,
        abi: staticAddressConditionFactoryAbi,
        functionName: 'getDeployed',
        args: staticAddrCondArgs,
      },
    },
    {
      name: 'operator',
      contract: {
        address: factories.paymentOperator,
        abi: paymentOperatorFactoryAbi,
        functionName: 'getOperator',
        args: [operatorConfig],
      },
    },
  ]

  if (hasFreeze && freezeArgs) {
    existenceEntries.push({
      name: 'freeze',
      contract: {
        address: factories.freeze,
        abi: freezeFactoryAbi,
        functionName: 'getDeployed',
        args: freezeArgs,
      },
    })
  }
  if (andCondArgs) {
    existenceEntries.push({
      name: 'andCondition',
      contract: {
        address: factories.andCondition,
        abi: andConditionFactoryAbi,
        functionName: 'getDeployed',
        args: andCondArgs,
      },
    })
  }
  if (hasFee) {
    existenceEntries.push({
      name: 'feeCalculator',
      contract: {
        address: factories.staticFeeCalculator,
        abi: staticFeeCalculatorFactoryAbi,
        functionName: 'getDeployed',
        args: [operatorFeeBps],
      },
    })
  }

  const existenceResults = await publicClient.multicall({
    contracts: existenceEntries.map((e) => e.contract) as Parameters<
      typeof publicClient.multicall
    >[0]['contracts'],
  })

  const existsMap = new Map<string, boolean>()
  for (let i = 0; i < existenceEntries.length; i++) {
    existsMap.set(
      existenceEntries[i].name,
      existenceResults[i].result !== zeroAddress,
    )
  }

  const exists = {
    escrowPeriod: existsMap.get('escrowPeriod') ?? false,
    refundRequest: existsMap.get('refundRequest') ?? false,
    staticAddressCondition: existsMap.get('staticAddressCondition') ?? false,
    operator: existsMap.get('operator') ?? false,
    freeze: existsMap.get('freeze') ?? false,
    andCondition: existsMap.get('andCondition') ?? false,
    feeCalculator: existsMap.get('feeCalculator') ?? !hasFee,
  }

  // If operator already deployed, return immediately
  if (exists.operator) {
    const existingDeployments: DeployResult[] = [
      { address: escrowPeriodAddress, hash: null, isNew: false },
      { address: refundRequestAddress, hash: null, isNew: false },
      { address: refundInEscrowConditionAddress, hash: null, isNew: false },
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
      refundRequestAddress,
      refundInEscrowConditionAddress,
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
    refundRequestAddress,
    exists.refundRequest,
    factories.refundRequest,
    refundRequestFactoryAbi,
    'deploy',
    refundRequestArgs,
  )
  trackDeploy(
    refundInEscrowConditionAddress,
    exists.staticAddressCondition,
    factories.staticAddressCondition,
    staticAddressConditionFactoryAbi,
    'deploy',
    staticAddrCondArgs,
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

  const { request, result: batchResults } = await publicClient.simulateContract(
    {
      address: MULTICALL3,
      abi: multicall3Abi,
      functionName: 'aggregate3',
      args: [calls],
      account: walletClient.account,
    },
  )

  // Verify all calls succeeded in simulation before sending the real tx.
  // Factory deploys use allowFailure:true as a CREATE2 race-condition safety
  // net, but a simulation failure means something is genuinely wrong.
  for (let i = 0; i < batchResults.length; i++) {
    if (!batchResults[i].success) {
      throw new ConfigError(
        `Multicall3 batch deploy: call ${i} failed in simulation`,
      )
    }
  }

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
    refundRequestAddress,
    refundInEscrowConditionAddress,
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
  refundRequestAddress: Address
}

export interface ArbiterSetupDeployment {
  signatureConditionAddress: Address
  refundRequestAddress: Address
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

  const refundRequestAddress = await computeRefundRequestAddress(publicClient, {
    factoryAddress: factories.refundRequest,
    arbiter: options.arbiter,
  })

  return {
    signatureConditionAddress,
    refundRequestAddress,
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
  const { signatureConditionAddress, refundRequestAddress } = preview

  // Phase 2: Batch-check existence
  const arbiterExistenceEntries: MulticallContract[] = [
    {
      address: factories.signatureCondition,
      abi: signatureConditionFactoryAbi,
      functionName: 'getDeployed',
      args: [options.arbiter],
    },
    {
      address: factories.refundRequest,
      abi: refundRequestFactoryAbi,
      functionName: 'getDeployed',
      args: [options.arbiter],
    },
  ]
  const existenceResults = await publicClient.multicall({
    contracts: arbiterExistenceEntries as Parameters<
      typeof publicClient.multicall
    >[0]['contracts'],
  })

  const sigCondExists = existenceResults[0].result !== zeroAddress
  const refundReqExists = existenceResults[1].result !== zeroAddress

  // If both already exist, return immediately
  if (sigCondExists && refundReqExists) {
    return {
      signatureConditionAddress,
      refundRequestAddress,
      deployments: [
        { address: signatureConditionAddress, hash: null, isNew: false },
        { address: refundRequestAddress, hash: null, isNew: false },
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

  if (refundReqExists) {
    deployments.push({
      address: refundRequestAddress,
      hash: null,
      isNew: false,
    })
  } else {
    calls.push({
      target: factories.refundRequest,
      allowFailure: false,
      callData: encodeFunctionData({
        abi: refundRequestFactoryAbi,
        functionName: 'deploy',
        args: [options.arbiter],
      }),
    })
    deployments.push({
      address: refundRequestAddress,
      hash: null,
      isNew: true,
    })
  }

  // Phase 4: Send single transaction via Multicall3.aggregate3
  if (!walletClient.account) {
    throw new ConfigError('walletClient.account is required for deployment')
  }

  const { request, result: arbiterBatchResults } =
    await publicClient.simulateContract({
      address: MULTICALL3,
      abi: multicall3Abi,
      functionName: 'aggregate3',
      args: [calls],
      account: walletClient.account,
    })

  for (let i = 0; i < arbiterBatchResults.length; i++) {
    if (!arbiterBatchResults[i].success) {
      throw new ConfigError(
        `Multicall3 batch deploy: call ${i} failed in simulation`,
      )
    }
  }

  const txHash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  for (const d of deployments) {
    if (d.isNew) d.hash = txHash
  }

  const newCount = deployments.filter((d) => d.isNew).length
  const existingCount = deployments.filter((d) => !d.isNew).length

  return {
    signatureConditionAddress,
    refundRequestAddress,
    deployments,
    summary: { newCount, existingCount, txHashes: [txHash] },
  }
}
