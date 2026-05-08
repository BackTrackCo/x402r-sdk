import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import { encodeFunctionData, zeroAddress } from 'viem'
import {
  andConditionFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  hookCombinatorFactoryAbi,
  orConditionFactoryAbi,
  paymentOperatorFactoryAbi,
  refundRequestEvidenceFactoryAbi,
  refundRequestFactoryAbi,
  signatureConditionFactoryAbi,
  staticAddressConditionFactoryAbi,
  staticFeeCalculatorFactoryAbi,
} from '../abis/generated.js'
import {
  getChainConfig,
  getConditionSingletons,
  getFactoryAddresses,
  getHookSingletons,
  hookCombinatorCodehash,
} from '../config/index.js'
import { ConfigError } from '../errors/index.js'
import type { OperatorConfig } from '../types/index.js'
import {
  computeAndConditionAddress,
  computeEscrowPeriodAddress,
  computeFeeCalculatorAddress,
  computeFreezeAddress,
  computeHookCombinatorAddress,
  computeOperatorAddress,
  computeOrConditionAddress,
  computeRefundRequestAddress,
  computeRefundRequestEvidenceAddress,
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

// ---------------------------------------------------------------------------
// Post-deploy bytecode verification + retry
// ---------------------------------------------------------------------------

/**
 * Estimate gas for a Multicall3 aggregate3 batch by temporarily setting all
 * calls to allowFailure:false. This forces eth_estimateGas to find a gas
 * limit where every sub-call succeeds, preventing the known underestimation
 * when allowFailure:true lets the estimator converge on partial-success gas.
 * See: https://github.com/ethereum/go-ethereum/issues/18519
 */
async function estimateBatchGas(
  publicClient: PublicClient,
  calls: Multicall3Call[],
  account: { address: Address },
): Promise<bigint> {
  const strictCalls = calls.map((c) => ({ ...c, allowFailure: false }))
  const estimated = await publicClient.estimateContractGas({
    address: MULTICALL3,
    abi: multicall3Abi,
    functionName: 'aggregate3',
    args: [strictCalls],
    account: account.address,
  })
  return (estimated * 120n) / 100n
}

/**
 * Defense-in-depth: verify that all new deployments have bytecode on-chain.
 * The primary fix for silent sub-call failures is proper gas estimation via
 * `estimateBatchGas`, but this retry mechanism catches edge cases like
 * concurrent deploys or unusual RPC behavior.
 */
async function verifyAndRetryDeploys(
  publicClient: PublicClient,
  walletClient: WalletClient,
  deployments: DeployResult[],
  calls: Multicall3Call[],
  txHashes: Hex[],
): Promise<void> {
  let callIdx = 0
  for (const d of deployments) {
    if (!d.isNew) continue
    const code = await publicClient.getCode({ address: d.address })
    if (!code || code === '0x') {
      // Retry this deploy as a standalone transaction
      const call = calls[callIdx]
      const retryHash = await walletClient.sendTransaction({
        to: call.target,
        data: call.callData,
        account: walletClient.account!,
        chain: publicClient.chain,
      })
      await publicClient.waitForTransactionReceipt({ hash: retryHash })
      const retryCode = await publicClient.getCode({ address: d.address })
      if (!retryCode || retryCode === '0x') {
        throw new ConfigError(
          `Deploy verification failed: no bytecode at ${d.address}`,
        )
      }
      d.hash = retryHash
      txHashes.push(retryHash)
    }
    callIdx++
  }
}

// ---------------------------------------------------------------------------
// Shared Phase 4: simulate → gas → send → verify batch deploy
// ---------------------------------------------------------------------------

async function executeBatchDeploy(
  publicClient: PublicClient,
  walletClient: WalletClient,
  calls: Multicall3Call[],
  deployments: DeployResult[],
): Promise<{ txHashes: Hex[]; newCount: number; existingCount: number }> {
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

  for (let i = 0; i < batchResults.length; i++) {
    if (!batchResults[i].success) {
      throw new ConfigError(
        `Multicall3 batch deploy: call ${i} failed in simulation`,
      )
    }
  }

  const gas = await estimateBatchGas(publicClient, calls, walletClient.account!)
  const txHash = await walletClient.writeContract({ ...request, gas })
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  for (const d of deployments) {
    if (d.isNew) d.hash = txHash
  }

  const txHashes: Hex[] = [txHash]
  await verifyAndRetryDeploys(
    publicClient,
    walletClient,
    deployments,
    calls,
    txHashes,
  )

  const newCount = deployments.filter((d) => d.isNew).length
  const existingCount = deployments.filter((d) => !d.isNew).length

  return { txHashes, newCount, existingCount }
}

// ---------------------------------------------------------------------------
// Marketplace operator types
// ---------------------------------------------------------------------------

export interface MarketplaceOperatorOptions {
  chainId: number
  feeReceiver: Address
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
  refundRequestEvidenceAddress: Address
  voidConditionAddress: Address
  feeCalculatorAddress: Address | null
  operatorConfig: OperatorConfig
}

export interface MarketplaceOperatorDeployment {
  operatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address | null
  refundRequestAddress: Address
  refundRequestEvidenceAddress: Address
  voidConditionAddress: Address
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
  const authorizedCodehash =
    options.authorizedCodehash ?? hookCombinatorCodehash
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
    factories,
    singletons,
    authorizedCodehash,
    freezeDurationSeconds,
    operatorFeeBps,
  } = resolveOptions(options)

  // Batch 1 (parallel): independent computations
  const [
    escrowPeriodAddress,
    refundRequestAddress,
    feeCalculatorAddress,
    staticAddrCondArbiterAddr,
  ] = await Promise.all([
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
    computeStaticAddressConditionAddress(publicClient, {
      factoryAddress: factories.staticAddressCondition,
      designatedAddress: options.arbiter,
    }),
  ])

  // Batch 2 (parallel): depends on batch 1 results
  // RefundRequest is an IHook — wired as voidPostActionHook (canonical authCapture wiring).
  // voidPreActionCondition = OrCondition(receiver, arbiterSAC) — either can approve.
  const [freezeAddress, refundRequestEvidenceAddress, voidConditionAddress] =
    await Promise.all([
      freezeDurationSeconds > 0n
        ? computeFreezeAddress(publicClient, {
            factoryAddress: factories.freeze,
            freezeCondition: singletons.payer,
            unfreezeCondition: staticAddrCondArbiterAddr,
            freezeDuration: freezeDurationSeconds,
            escrowPeriodContract: escrowPeriodAddress,
          })
        : Promise.resolve(null),
      computeRefundRequestEvidenceAddress(publicClient, {
        factoryAddress: factories.refundRequestEvidence,
        refundRequest: refundRequestAddress,
      }),
      computeOrConditionAddress(publicClient, {
        factoryAddress: factories.orCondition,
        conditions: [singletons.receiver, staticAddrCondArbiterAddr],
      }),
    ])

  // Batch 3: AND condition for capture (depends on batch 2, only when freeze enabled)
  const andConditionAddress =
    freezeDurationSeconds > 0n && freezeAddress
      ? await computeAndConditionAddress(publicClient, {
          factoryAddress: factories.andCondition,
          conditions: [escrowPeriodAddress, freezeAddress],
        })
      : null
  const releaseConditionAddress: Address =
    andConditionAddress ?? escrowPeriodAddress

  // Batch 4: operator (depends on everything)
  const operatorConfig: OperatorConfig = {
    feeReceiver: options.feeReceiver,
    feeCalculator: feeCalculatorAddress ?? zeroAddress,
    authorizePreActionCondition: zeroAddress,
    authorizePostActionHook: escrowPeriodAddress,
    chargePreActionCondition: zeroAddress,
    chargePostActionHook: zeroAddress,
    capturePreActionCondition: releaseConditionAddress,
    capturePostActionHook: zeroAddress,
    voidPreActionCondition: voidConditionAddress,
    voidPostActionHook: refundRequestAddress,
    refundPreActionCondition: singletons.receiver,
    refundPostActionHook: zeroAddress,
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
    refundRequestEvidenceAddress,
    voidConditionAddress,
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

/**
 * Deploy a marketplace PaymentOperator with all required condition contracts.
 *
 * **In-escrow refund flow:** Either the receiver (merchant) or the arbiter
 * can call `operator.voidPayment()` (which calls `escrow.void()` —
 * full-only under the authCapture surface), gated by
 * `OrCondition(ReceiverCondition, StaticAddressCondition(arbiter))`.
 * The RefundRequest IHook (wired as `voidPostActionHook`) automatically
 * approves any pending payer request.
 */
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
    refundRequestEvidenceAddress,
    voidConditionAddress,
    operatorAddress,
    operatorConfig,
  } = preview

  const hasFee = operatorFeeBps > 0n
  const hasFreeze = freezeDurationSeconds > 0n

  // SAC(arbiter) is always needed: used for void OrCondition + freeze unfreeze gate.
  const staticAddrCondArbiterAddr = await computeStaticAddressConditionAddress(
    publicClient,
    {
      factoryAddress: factories.staticAddressCondition,
      designatedAddress: options.arbiter,
    },
  )

  // ── Phase 2: Batch-check which contracts already exist ─────────────────
  const escrowArgs = [options.escrowPeriodSeconds, authorizedCodehash] as const
  const refundRequestArgs = [options.arbiter] as const
  const freezeArgs = hasFreeze
    ? ([
        singletons.payer,
        staticAddrCondArbiterAddr!,
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
      name: 'refundRequestEvidence',
      contract: {
        address: factories.refundRequestEvidence,
        abi: refundRequestEvidenceFactoryAbi,
        functionName: 'getDeployed',
        args: [refundRequestAddress],
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

  // SAC(arbiter) always needed for OrCondition(receiver, arbiter) void gate
  existenceEntries.push({
    name: 'staticAddressConditionArbiter',
    contract: {
      address: factories.staticAddressCondition,
      abi: staticAddressConditionFactoryAbi,
      functionName: 'getDeployed',
      args: [options.arbiter],
    },
  })
  // OrCondition(receiver, arbiterSAC) for void gate
  existenceEntries.push({
    name: 'orConditionRefund',
    contract: {
      address: factories.orCondition,
      abi: orConditionFactoryAbi,
      functionName: 'getDeployed',
      args: [[singletons.receiver, staticAddrCondArbiterAddr]],
    },
  })
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
    refundRequestEvidence: existsMap.get('refundRequestEvidence') ?? false,
    operator: existsMap.get('operator') ?? false,
    staticAddressConditionArbiter:
      existsMap.get('staticAddressConditionArbiter') ?? false,
    orConditionRefund: existsMap.get('orConditionRefund') ?? false,
    freeze: existsMap.get('freeze') ?? false,
    andCondition: existsMap.get('andCondition') ?? false,
    feeCalculator: existsMap.get('feeCalculator') ?? !hasFee,
  }

  // If operator already deployed, return immediately
  if (exists.operator) {
    const existingDeployments: DeployResult[] = [
      { address: escrowPeriodAddress, hash: null, isNew: false },
      { address: refundRequestAddress, hash: null, isNew: false },
      { address: refundRequestEvidenceAddress, hash: null, isNew: false },
      { address: staticAddrCondArbiterAddr, hash: null, isNew: false },
      { address: voidConditionAddress, hash: null, isNew: false },
    ]
    if (hasFreeze && freezeAddress) {
      existingDeployments.push({
        address: freezeAddress,
        hash: null,
        isNew: false,
      })
      existingDeployments.push({
        address: preview.operatorConfig.capturePreActionCondition,
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
      refundRequestEvidenceAddress,
      voidConditionAddress,
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
    refundRequestEvidenceAddress,
    exists.refundRequestEvidence,
    factories.refundRequestEvidence,
    refundRequestEvidenceFactoryAbi,
    'deploy',
    [refundRequestAddress],
  )
  trackDeploy(
    staticAddrCondArbiterAddr,
    exists.staticAddressConditionArbiter,
    factories.staticAddressCondition,
    staticAddressConditionFactoryAbi,
    'deploy',
    [options.arbiter],
  )
  trackDeploy(
    voidConditionAddress,
    exists.orConditionRefund,
    factories.orCondition,
    orConditionFactoryAbi,
    'deploy',
    [[singletons.receiver, staticAddrCondArbiterAddr]],
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
    preview.operatorConfig.capturePreActionCondition !== escrowPeriodAddress
  ) {
    trackDeploy(
      preview.operatorConfig.capturePreActionCondition,
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
  const { txHashes, newCount, existingCount } = await executeBatchDeploy(
    publicClient,
    walletClient,
    calls,
    deployments,
  )

  return {
    operatorAddress,
    escrowPeriodAddress,
    freezeAddress,
    refundRequestAddress,
    refundRequestEvidenceAddress,
    voidConditionAddress,
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
  refundRequestAddress: Address
  refundRequestEvidenceAddress: Address
}

export interface ArbiterSetupDeployment {
  signatureConditionAddress: Address
  refundRequestAddress: Address
  refundRequestEvidenceAddress: Address
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

  const refundRequestEvidenceAddress =
    await computeRefundRequestEvidenceAddress(publicClient, {
      factoryAddress: factories.refundRequestEvidence,
      refundRequest: refundRequestAddress,
    })

  return {
    signatureConditionAddress,
    refundRequestAddress,
    refundRequestEvidenceAddress,
  }
}

// ---------------------------------------------------------------------------
// deployArbiterSetup — single-tx via Multicall3
// ---------------------------------------------------------------------------

// SignatureCondition is co-deployed because it is still needed for operator
// condition slots (AUTHORIZE/CHARGE/RELEASE gating). RefundRequest uses the
// arbiter address directly — they are independent contracts bundled here
// for deployment convenience.
export async function deployArbiterSetup(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: ArbiterSetupOptions,
): Promise<ArbiterSetupDeployment> {
  const factories = getFactoryAddresses(options.chainId)

  // Phase 1: Compute deterministic addresses
  const preview = await previewArbiterSetup(publicClient, options)
  const {
    signatureConditionAddress,
    refundRequestAddress,
    refundRequestEvidenceAddress,
  } = preview

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
    {
      address: factories.refundRequestEvidence,
      abi: refundRequestEvidenceFactoryAbi,
      functionName: 'getDeployed',
      args: [refundRequestAddress],
    },
  ]
  const existenceResults = await publicClient.multicall({
    contracts: arbiterExistenceEntries as Parameters<
      typeof publicClient.multicall
    >[0]['contracts'],
  })

  const sigCondExists = existenceResults[0].result !== zeroAddress
  const refundReqExists = existenceResults[1].result !== zeroAddress
  const evidenceExists = existenceResults[2].result !== zeroAddress

  // If all already exist, return immediately
  if (sigCondExists && refundReqExists && evidenceExists) {
    return {
      signatureConditionAddress,
      refundRequestAddress,
      refundRequestEvidenceAddress,
      deployments: [
        { address: signatureConditionAddress, hash: null, isNew: false },
        { address: refundRequestAddress, hash: null, isNew: false },
        { address: refundRequestEvidenceAddress, hash: null, isNew: false },
      ],
      summary: { newCount: 0, existingCount: 3, txHashes: [] },
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

  if (evidenceExists) {
    deployments.push({
      address: refundRequestEvidenceAddress,
      hash: null,
      isNew: false,
    })
  } else {
    calls.push({
      target: factories.refundRequestEvidence,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: refundRequestEvidenceFactoryAbi,
        functionName: 'deploy',
        args: [refundRequestAddress],
      }),
    })
    deployments.push({
      address: refundRequestEvidenceAddress,
      hash: null,
      isNew: true,
    })
  }

  // Phase 4: Send single transaction via Multicall3.aggregate3
  const { txHashes, newCount, existingCount } = await executeBatchDeploy(
    publicClient,
    walletClient,
    calls,
    deployments,
  )

  return {
    signatureConditionAddress,
    refundRequestAddress,
    refundRequestEvidenceAddress,
    deployments,
    summary: { newCount, existingCount, txHashes },
  }
}

// ---------------------------------------------------------------------------
// Delivery protection operator types
// ---------------------------------------------------------------------------

export interface DeliveryProtectionOperatorOptions {
  chainId: number
  arbiter: Address
  feeReceiver: Address
  escrowPeriodSeconds: bigint
  /** Override default authorizedCodehash (default: hookCombinatorCodehash from config) */
  authorizedCodehash?: Hex
  /** Override PaymentIndexRecorderHook address (default: from config, zeroAddress = skip) */
  paymentIndexRecorderHookAddress?: Address
  /** Allow arbiter to void immediately during escrow (default: false). When true, arbiter is added to the void OrCondition. */
  allowArbiterRefund?: boolean
}

export interface DeliveryProtectionOperatorPreview {
  operatorAddress: Address
  escrowPeriodAddress: Address
  arbiterConditionAddress: Address
  releaseConditionAddress: Address
  voidConditionAddress: Address
  authorizeHookAddress: Address
  paymentIndexRecorderHookAddress: Address
  operatorConfig: OperatorConfig
}

export interface DeliveryProtectionOperatorDeployment {
  operatorAddress: Address
  escrowPeriodAddress: Address
  arbiterConditionAddress: Address
  releaseConditionAddress: Address
  voidConditionAddress: Address
  authorizeHookAddress: Address
  paymentIndexRecorderHookAddress: Address
  operatorConfig: OperatorConfig
  deployments: DeployResult[]
  summary: {
    newCount: number
    existingCount: number
    txHashes: `0x${string}`[]
  }
}

// ---------------------------------------------------------------------------
// previewDeliveryProtectionOperator — read-only address computation
// ---------------------------------------------------------------------------

export async function previewDeliveryProtectionOperator(
  publicClient: PublicClient,
  options: DeliveryProtectionOperatorOptions,
): Promise<DeliveryProtectionOperatorPreview> {
  const factoryAddrs = getFactoryAddresses(options.chainId)
  const singletons = getConditionSingletons(options.chainId)
  const hookSingletons = getHookSingletons(options.chainId)

  const authorizedCodehash =
    options.authorizedCodehash ?? hookCombinatorCodehash
  const paymentIndexRecorderHookAddress =
    options.paymentIndexRecorderHookAddress ??
    hookSingletons.paymentIndexRecorderHook
  const hasPaymentIndexRecorderHook =
    paymentIndexRecorderHookAddress !== zeroAddress
  const allowArbiterRefund = options.allowArbiterRefund ?? false

  // Batch 1 (parallel, no dependencies)
  const [escrowPeriodAddress, arbiterConditionAddress] = await Promise.all([
    computeEscrowPeriodAddress(publicClient, {
      factoryAddress: factoryAddrs.escrowPeriod,
      escrowPeriod: options.escrowPeriodSeconds,
      authorizedCodehash,
    }),
    computeStaticAddressConditionAddress(publicClient, {
      factoryAddress: factoryAddrs.staticAddressCondition,
      designatedAddress: options.arbiter,
    }),
  ])

  // RefundInEscrow legs: always escrow period + receiver, optionally arbiter
  const voidLegs: Address[] = allowArbiterRefund
    ? [escrowPeriodAddress, singletons.receiver, arbiterConditionAddress]
    : [escrowPeriodAddress, singletons.receiver]

  // Batch 2 (parallel, depends on batch 1)
  const [releaseConditionAddress, voidConditionAddress, authorizeHookAddress] =
    await Promise.all([
      // Release: arbiter OR payer
      computeOrConditionAddress(publicClient, {
        factoryAddress: factoryAddrs.orCondition,
        conditions: [arbiterConditionAddress, singletons.payer],
      }),
      // RefundInEscrow: escrow period expired OR receiver [OR arbiter]
      computeOrConditionAddress(publicClient, {
        factoryAddress: factoryAddrs.orCondition,
        conditions: voidLegs,
      }),
      // AuthorizePostActionHook: EscrowPeriod + PaymentIndexRecorderHook (if available)
      hasPaymentIndexRecorderHook
        ? computeHookCombinatorAddress(publicClient, {
            factoryAddress: factoryAddrs.hookCombinator,
            hooks: [escrowPeriodAddress, paymentIndexRecorderHookAddress],
          })
        : Promise.resolve(escrowPeriodAddress),
    ])

  // feeCalculator is zeroAddress (no fees charged) but feeReceiver is still
  // required by the factory's non-zero validation. This future-proofs the
  // operator: when a fee calculator is added later, the recipient is already
  // set — no redeployment needed.
  const operatorConfig: OperatorConfig = {
    feeReceiver: options.feeReceiver,
    feeCalculator: zeroAddress,
    authorizePreActionCondition: zeroAddress,
    authorizePostActionHook: authorizeHookAddress,
    chargePreActionCondition: zeroAddress,
    chargePostActionHook: zeroAddress,
    capturePreActionCondition: releaseConditionAddress,
    capturePostActionHook: zeroAddress,
    voidPreActionCondition: voidConditionAddress,
    voidPostActionHook: zeroAddress,
    refundPreActionCondition: singletons.receiver,
    refundPostActionHook: zeroAddress,
  }

  const operatorAddress = await computeOperatorAddress(publicClient, {
    factoryAddress: factoryAddrs.paymentOperator,
    config: operatorConfig,
  })

  return {
    operatorAddress,
    escrowPeriodAddress,
    arbiterConditionAddress,
    releaseConditionAddress,
    voidConditionAddress,
    authorizeHookAddress,
    paymentIndexRecorderHookAddress,
    operatorConfig,
  }
}

// ---------------------------------------------------------------------------
// deployDeliveryProtectionOperator — single-tx via Multicall3
//
// Deploys a PaymentOperator where:
// - Release: OrCondition([SAC(arbiter), PayerCondition]) — arbiter or payer
// - RefundInEscrow: OrCondition([EscrowPeriod, ReceiverCondition, SAC(arbiter)])
//   — after escrow window, or receiver, or arbiter
// - AuthorizePostActionHook: HookCombinator([EscrowPeriod, PaymentIndexRecorderHook])
//   — records auth time + indexes payments
// ---------------------------------------------------------------------------

export async function deployDeliveryProtectionOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: DeliveryProtectionOperatorOptions,
): Promise<DeliveryProtectionOperatorDeployment> {
  const factoryAddrs = getFactoryAddresses(options.chainId)
  const singletons = getConditionSingletons(options.chainId)
  const authorizedCodehash =
    options.authorizedCodehash ?? hookCombinatorCodehash
  const allowArbiterRefund = options.allowArbiterRefund ?? false

  // Phase 1: Compute all deterministic addresses
  const preview = await previewDeliveryProtectionOperator(publicClient, options)
  const {
    escrowPeriodAddress,
    arbiterConditionAddress,
    releaseConditionAddress,
    voidConditionAddress,
    authorizeHookAddress,
    paymentIndexRecorderHookAddress,
    operatorAddress,
    operatorConfig,
  } = preview

  const hasPaymentIndexRecorderHook =
    paymentIndexRecorderHookAddress !== zeroAddress
  const hasCombinator =
    hasPaymentIndexRecorderHook && authorizeHookAddress !== escrowPeriodAddress

  // Phase 2: Batch-check which contracts already exist
  // Named entries so results are keyed by name, not brittle array indices
  const existenceEntries: { name: string; contract: MulticallContract }[] = [
    {
      name: 'escrowPeriod',
      contract: {
        address: factoryAddrs.escrowPeriod,
        abi: escrowPeriodFactoryAbi,
        functionName: 'getDeployed',
        args: [options.escrowPeriodSeconds, authorizedCodehash],
      },
    },
    {
      name: 'arbiterCondition',
      contract: {
        address: factoryAddrs.staticAddressCondition,
        abi: staticAddressConditionFactoryAbi,
        functionName: 'getDeployed',
        args: [options.arbiter],
      },
    },
    {
      name: 'releaseCondition',
      contract: {
        address: factoryAddrs.orCondition,
        abi: orConditionFactoryAbi,
        functionName: 'getDeployed',
        args: [[arbiterConditionAddress, singletons.payer]],
      },
    },
    {
      name: 'refundCondition',
      contract: {
        address: factoryAddrs.orCondition,
        abi: orConditionFactoryAbi,
        functionName: 'getDeployed',
        args: [
          allowArbiterRefund
            ? [
                escrowPeriodAddress,
                singletons.receiver,
                arbiterConditionAddress,
              ]
            : [escrowPeriodAddress, singletons.receiver],
        ],
      },
    },
  ]
  if (hasCombinator) {
    existenceEntries.push({
      name: 'combinator',
      contract: {
        address: factoryAddrs.hookCombinator,
        abi: hookCombinatorFactoryAbi,
        functionName: 'getDeployed',
        args: [[escrowPeriodAddress, paymentIndexRecorderHookAddress]],
      },
    })
  }
  existenceEntries.push({
    name: 'operator',
    contract: {
      address: factoryAddrs.paymentOperator,
      abi: paymentOperatorFactoryAbi,
      functionName: 'getOperator',
      args: [operatorConfig],
    },
  })

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
    arbiterCondition: existsMap.get('arbiterCondition') ?? false,
    releaseCondition: existsMap.get('releaseCondition') ?? false,
    refundCondition: existsMap.get('refundCondition') ?? false,
    combinator: existsMap.get('combinator') ?? !hasCombinator,
    operator: existsMap.get('operator') ?? false,
  }

  const totalContracts = hasCombinator ? 6 : 5

  // If operator already deployed, return immediately
  if (exists.operator) {
    const existingDeployments: DeployResult[] = [
      { address: escrowPeriodAddress, hash: null, isNew: false },
      { address: arbiterConditionAddress, hash: null, isNew: false },
      { address: releaseConditionAddress, hash: null, isNew: false },
      { address: voidConditionAddress, hash: null, isNew: false },
      ...(hasCombinator
        ? [{ address: authorizeHookAddress, hash: null, isNew: false }]
        : []),
      { address: operatorAddress, hash: null, isNew: false },
    ]
    return {
      operatorAddress,
      escrowPeriodAddress,
      arbiterConditionAddress,
      releaseConditionAddress,
      voidConditionAddress,
      authorizeHookAddress,
      paymentIndexRecorderHookAddress,
      operatorConfig,
      deployments: existingDeployments,
      summary: {
        newCount: 0,
        existingCount: totalContracts,
        txHashes: [],
      },
    }
  }

  // Phase 3: Build deploy calls for missing contracts
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
      deployments.push({ address, hash: null, isNew: true })
    }
  }

  // 1. EscrowPeriod
  trackDeploy(
    escrowPeriodAddress,
    exists.escrowPeriod,
    factoryAddrs.escrowPeriod,
    escrowPeriodFactoryAbi,
    'deploy',
    [options.escrowPeriodSeconds, authorizedCodehash],
  )

  // 2. StaticAddressCondition(arbiter)
  trackDeploy(
    arbiterConditionAddress,
    exists.arbiterCondition,
    factoryAddrs.staticAddressCondition,
    staticAddressConditionFactoryAbi,
    'deploy',
    [options.arbiter],
  )

  // 3. OrCondition for capture: arbiter OR payer
  trackDeploy(
    releaseConditionAddress,
    exists.releaseCondition,
    factoryAddrs.orCondition,
    orConditionFactoryAbi,
    'deploy',
    [[arbiterConditionAddress, singletons.payer]],
  )

  // 4. OrCondition for void: escrow period OR receiver [OR arbiter]
  trackDeploy(
    voidConditionAddress,
    exists.refundCondition,
    factoryAddrs.orCondition,
    orConditionFactoryAbi,
    'deploy',
    [
      allowArbiterRefund
        ? [escrowPeriodAddress, singletons.receiver, arbiterConditionAddress]
        : [escrowPeriodAddress, singletons.receiver],
    ],
  )

  // 5. HookCombinator (if PaymentIndexRecorderHook available)
  if (hasCombinator) {
    trackDeploy(
      authorizeHookAddress,
      exists.combinator,
      factoryAddrs.hookCombinator,
      hookCombinatorFactoryAbi,
      'deploy',
      [[escrowPeriodAddress, paymentIndexRecorderHookAddress]],
    )
  }

  // 6. Operator (always included, never allowFailure)
  calls.push({
    target: factoryAddrs.paymentOperator,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: paymentOperatorFactoryAbi,
      functionName: 'deployOperator',
      args: [operatorConfig],
    }),
  })
  deployments.push({ address: operatorAddress, hash: null, isNew: true })

  // Phase 4: Send single transaction via Multicall3.aggregate3
  const { txHashes, newCount, existingCount } = await executeBatchDeploy(
    publicClient,
    walletClient,
    calls,
    deployments,
  )

  return {
    operatorAddress,
    escrowPeriodAddress,
    arbiterConditionAddress,
    releaseConditionAddress,
    voidConditionAddress,
    authorizeHookAddress,
    paymentIndexRecorderHookAddress,
    operatorConfig,
    deployments,
    summary: { newCount, existingCount, txHashes },
  }
}
