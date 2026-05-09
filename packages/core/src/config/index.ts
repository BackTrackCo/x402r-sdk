import { type Address, type Hex, zeroAddress } from 'viem'
import { ConfigError } from '../errors/index.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactoryAddresses {
  paymentOperator: Address
  escrowPeriod: Address
  freeze: Address
  staticFeeCalculator: Address
  staticAddressCondition: Address
  andCondition: Address
  orCondition: Address
  notCondition: Address
  hookCombinator: Address
  signatureCondition: Address
  refundRequest: Address
  refundRequestEvidence: Address
}

export interface ConditionSingletonAddresses {
  payer: Address
  receiver: Address
  alwaysTrue: Address
}

export interface HookSingletonAddresses {
  /** PaymentIndexRecorderHook(escrow, hookCombinatorCodehash) — deploy once, share across operators */
  paymentIndexRecorderHook: Address
}

export interface X402rChainConfig {
  name: string
  chainId: number
  authCaptureEscrow: Address
  tokenCollector: Address
  protocolFeeConfig: Address
  receiverRefundCollector: Address
  usdc: Address
  factories: FactoryAddresses
  conditions: ConditionSingletonAddresses
  hooks: HookSingletonAddresses
}

// ---------------------------------------------------------------------------
// Canonical CREATE2 addresses
// ---------------------------------------------------------------------------
//
// Two salt namespaces (see `x402r-contracts/script/DeployX402r.s.sol`):
//   - `x402r-canonical-v1::<ContractName>` — escrow-independent contracts
//       (ProtocolFeeConfig, condition singletons, ctor-arg-free factories,
//       RefundRequestEvidenceFactory). Live on the chains in
//       `x402r-contracts/deployments/canonical.json`.
//   - `x402r-canonical-v1.0.1::<ContractName>` — escrow-dependent contracts
//       (PaymentOperatorFactory, EscrowPeriodFactory, FreezeFactory,
//       RefundRequestFactory, ReceiverRefundCollector, PaymentIndexRecorderHook).
//       Same source as v1, rebound to the canonical AuthCaptureEscrow from
//       `commerce-payments at v1.0.0`. Deployable today only on Base mainnet
//       (8453) and Base Sepolia (84532); see
//       `x402r-contracts/deployments/canonical-v1.0.1.json`.
//
// Source of truth: `x402r-contracts/script/PredictAddresses.s.sol` and
// `x402r-contracts/script/DeployX402r.s.sol`. Owner / fee recipient
// (`0x773dBcB5BDb3Df8359ba4e42D7Ce7AE3fC9Ee235`) is baked into the CREATE2
// address of `ProtocolFeeConfig`; the canonical AuthCaptureEscrow is baked
// into every v1.0.1 address.

/** AuthCaptureEscrow at the canonical `commerce-payments at v1.0.0` deployment. */
export const authCaptureEscrow =
  '0xBdEA0D1bcC5966192B070Fdf62aB4EF5b4420cff' as const satisfies Address

/**
 * Primary token collector. Currently aliases the canonical
 * `ERC3009PaymentCollector` — Permit2 lands in a follow-up PR.
 */
export const tokenCollector =
  '0x0E3dF9510de65469C4518D7843919c0b8C7A7757' as const satisfies Address

export const protocolFeeConfig =
  '0xBe2d24614F339a1eB103A399F93AA2a39Ca815Bc' as const satisfies Address
export const receiverRefundCollector =
  '0x88C9826dFA17Ad9d3a726015C667dD995394D341' as const satisfies Address

/** Chain-invariant CREATE2 factory addresses. Same as `getChainConfig(chainId).factories`. */
export const factories = {
  // v1.0.1 (escrow-bound)
  paymentOperator: '0xa0d4734842df1690a5B33Cb21828c946e39D55a2',
  escrowPeriod: '0xe72D2014ebC48F1d92521e8629574918E8030548',
  freeze: '0xeC092cf1215DB44af0Abe87c1157E304FEa5d0Eb',
  refundRequest: '0xe971C674fD5c3462023f3F891dF6289DFbC9CEFC',
  // v1 (escrow-free)
  staticFeeCalculator: '0x97F99AB01F86b480f751B7b81166Dbe1F113e6C3',
  staticAddressCondition: '0x77B379390750E1d3F802cC220926694D2454903E',
  andCondition: '0x2B07d750C639b65a26e43F1FDCE404b21DCf16D9',
  orCondition: '0x0519a37c0A996DD5F1e81e07b4aD3B24C257BC90',
  notCondition: '0xb9c3223D059C3cAbD482bB54f3d7cD52DE70A9ae',
  hookCombinator: '0x30B5373FD791D2d7b28C3B8020EB68b032f3f960',
  signatureCondition: '0x46Fabd81d294d8589D5c7fCf4276bF966d0b0057',
  refundRequestEvidence: '0x4089A5A853e9eF35f504B842795fB272dF69c739',
} as const satisfies FactoryAddresses

/** Chain-invariant CREATE2 condition singleton addresses. Same as `getChainConfig(chainId).conditions`. */
export const conditions = {
  payer: '0x586486394C38A2a7d36B16a3FDaF366cd202d823',
  receiver: '0x321651df4593DA57C413579c5b611D1A90168a3A',
  alwaysTrue: '0x2ef2A6162aEF9Df1022ff51c011af94D99AB4904',
} as const satisfies ConditionSingletonAddresses

/**
 * Chain-invariant hook singleton addresses.
 *
 * `paymentIndexRecorderHook` is a chain singleton because both ctor args are
 * chain-invariants — `escrow` is the canonical AuthCaptureEscrow and
 * `authorizedCodehash` is `keccak256(type(HookCombinator).runtimeCode)` (every
 * `HookCombinator` instance shares the same runtime code regardless of stored
 * hooks; per-instance config lives in storage, not bytecode). Routing your
 * operator's post-action through `HookCombinator` lets it reuse this single
 * deployment instead of per-operator instances.
 */
export const hooks = {
  paymentIndexRecorderHook:
    '0x358ECA14fFD51e63D2Bb8DDE3aBAA14f8D5274C3' as const satisfies Address,
} as const satisfies HookSingletonAddresses

/**
 * Runtime codehash of HookCombinator contract.
 * All HookCombinator instances share identical runtime bytecode —
 * constructor args affect storage, not deployed code.
 * Computed from `x402r-contracts/out/HookCombinator.sol/HookCombinator.json`
 * deployedBytecode at the locked toolchain (foundry.toml).
 */
export const hookCombinatorCodehash: Hex =
  '0x99360a2e57387c49050f431d3df9700c14699850a53c993c30ac53ac4dd9e063'

// ---------------------------------------------------------------------------
// commerce-payments v1.0.0 primitives — canonical addresses
// ---------------------------------------------------------------------------
//
// The audited `commerce-payments at v1.0.0` deployment of `AuthCaptureEscrow`
// and the two payment collectors. Live today on Base mainnet (8453) and
// Base Sepolia (84532); other chains follow as canonical coverage extends.

/** AuthCaptureEscrow at canonical address (alias of `authCaptureEscrow`). */
export const commercePaymentsAuthCaptureEscrow = authCaptureEscrow

/** ERC3009PaymentCollector(escrow, multicall3) at canonical address. */
export const commercePaymentsErc3009PaymentCollector =
  '0x0E3dF9510de65469C4518D7843919c0b8C7A7757' as const satisfies Address

/** Permit2PaymentCollector(escrow, permit2, multicall3) at canonical address. */
export const commercePaymentsPermit2PaymentCollector =
  '0x992476B9Ee81d52a5BdA0622C333938D0Af0aB26' as const satisfies Address

/** Convenience bundle of all three commerce-payments primitive addresses. */
export const commercePaymentsAddresses = {
  authCaptureEscrow: commercePaymentsAuthCaptureEscrow,
  erc3009PaymentCollector: commercePaymentsErc3009PaymentCollector,
  permit2PaymentCollector: commercePaymentsPermit2PaymentCollector,
} as const

const PROTOCOL_ADDRESSES = {
  authCaptureEscrow,
  tokenCollector,
  protocolFeeConfig,
  receiverRefundCollector,
  factories,
  conditions,
  hooks,
} as const

/** Build a chain config by spreading unified protocol addresses + chain-specific USDC */
function chainConfig(
  name: string,
  chainId: number,
  usdc: Address,
): X402rChainConfig {
  return {
    name,
    chainId,
    ...PROTOCOL_ADDRESSES,
    usdc,
  }
}

// ---------------------------------------------------------------------------
// Chain registry
// ---------------------------------------------------------------------------

// Supported chains are the chains where the canonical AuthCaptureEscrow lives.
// Today: Base mainnet + Base Sepolia. Other EVMs will be added as canonical
// `commerce-payments at v1.0.0` coverage extends.
export const x402rChains = {
  84532: chainConfig(
    'Base Sepolia',
    84532,
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  ),
  8453: chainConfig('Base', 8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
} as const satisfies Record<number, X402rChainConfig>

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type SupportedChainId = keyof typeof x402rChains

export const supportedChainIds = Object.keys(x402rChains).map(
  Number,
) as SupportedChainId[]

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

export function getChainConfig(chainId: number): X402rChainConfig {
  const config = x402rChains[chainId as keyof typeof x402rChains] as
    | X402rChainConfig
    | undefined
  if (!config) {
    throw new ConfigError(`Chain ${chainId} is not supported`, {
      metaMessages: [`Supported chains: ${supportedChainIds.join(', ')}`],
    })
  }
  return config
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId in x402rChains
}

export function getFactoryAddresses(chainId: number): FactoryAddresses {
  const config = getChainConfig(chainId)
  if (!config.factories) {
    throw new ConfigError(`Factories are not deployed on ${config.name}`)
  }
  return config.factories
}

export function getFactoryAddress(
  chainId: number,
  factory: keyof FactoryAddresses,
): Address {
  const config = getChainConfig(chainId)
  if (!config.factories) {
    throw new ConfigError(`Factories are not deployed on ${config.name}`)
  }
  const address = config.factories[factory]
  if (address === zeroAddress) {
    throw new ConfigError(
      `${factory} factory is not deployed on ${config.name}`,
    )
  }
  return address
}

export function getConditionSingletons(
  chainId: number,
): ConditionSingletonAddresses {
  const config = getChainConfig(chainId)
  if (!config.conditions) {
    throw new ConfigError(
      `Condition singletons are not deployed on ${config.name}`,
    )
  }
  const { payer, receiver, alwaysTrue } = config.conditions
  if (
    payer === zeroAddress ||
    receiver === zeroAddress ||
    alwaysTrue === zeroAddress
  ) {
    throw new ConfigError(
      `Condition singletons are not fully deployed on ${config.name}`,
      {
        metaMessages: [
          'This is a protocol-level deployment — contact the x402r team.',
        ],
      },
    )
  }
  return config.conditions
}

export function getHookSingletons(chainId: number): HookSingletonAddresses {
  const config = getChainConfig(chainId)
  return config.hooks
}

export function hasFactories(chainId: number): boolean {
  const config = x402rChains[chainId as keyof typeof x402rChains] as
    | X402rChainConfig
    | undefined
  return !!config?.factories
}

export function hasConditionSingletons(chainId: number): boolean {
  const config = x402rChains[chainId as keyof typeof x402rChains] as
    | X402rChainConfig
    | undefined
  if (!config?.conditions) return false
  const { payer, receiver, alwaysTrue } = config.conditions
  return (
    payer !== zeroAddress &&
    receiver !== zeroAddress &&
    alwaysTrue !== zeroAddress
  )
}

// ---------------------------------------------------------------------------
// CAIP-2 bridge
// ---------------------------------------------------------------------------

export function toNetworkId(chainId: number): string {
  return `eip155:${chainId}`
}

export function fromNetworkId(networkId: string): number {
  const match = networkId.match(/^eip155:(\d+)$/)
  if (!match) {
    throw new ConfigError(`Invalid CAIP-2 network identifier: ${networkId}`, {
      metaMessages: ['Expected format: eip155:<chainId>'],
    })
  }
  return Number(match[1])
}
