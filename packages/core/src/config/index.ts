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
  /** PaymentIndexHook(escrow, hookCombinatorCodehash) — deploy once, share across operators */
  paymentIndexHook: Address
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
// Canonical CREATE2 addresses (same on every chain)
// ---------------------------------------------------------------------------
//
// Deployed via CreateX permissionless salts. Same address on every chain that
// has CreateX. Derived from:
//   - commerce-payments primitives (MIT, vendored from `base/commerce-payments@v1.0.0`):
//       salt namespace `commerce-payments::v1::<ContractName>`
//   - x402r-authored contracts (BUSL):
//       salt namespace `x402r-canonical-v1::<ContractName>`
//
// Source of truth: `x402r-contracts/script/PredictAddresses.s.sol` and
// `x402r-contracts/script/DeployX402r.s.sol`. Owner / fee recipient
// (`0x773dBcB5BDb3Df8359ba4e42D7Ce7AE3fC9Ee235`) is baked into the CREATE2
// address of `ProtocolFeeConfig` and everything downstream — any change there
// moves the canonical addresses on that chain.

/** AuthCaptureEscrow at canonical CREATE2 address (commerce-payments v1.0.0). */
export const authCaptureEscrow =
  '0xF8211868187974a7Fb9d99b8fFB171AD70665Dc6' as const satisfies Address

/**
 * Primary token collector. Currently aliases the canonical
 * `ERC3009PaymentCollector` — Permit2 lands in a follow-up PR.
 */
export const tokenCollector =
  '0x7561DC178D9aD5bc5fb103C01f448A510d2A36D0' as const satisfies Address

export const protocolFeeConfig =
  '0xBe2d24614F339a1eB103A399F93AA2a39Ca815Bc' as const satisfies Address
export const receiverRefundCollector =
  '0xA452b17f0bA0531C7b1728C40FA30bCaF051cB12' as const satisfies Address

/** Chain-invariant CREATE2 factory addresses. Same as `getChainConfig(chainId).factories`. */
export const factories = {
  paymentOperator: '0x0308703621160b894cF045E555686d99ee8bd94E',
  escrowPeriod: '0xa076D7604A827ae1fe9B70248C80aB331a05E497',
  freeze: '0xC03A6E5538850528Fc77f740Ba4910fE8A542121',
  staticFeeCalculator: '0x97F99AB01F86b480f751B7b81166Dbe1F113e6C3',
  staticAddressCondition: '0x77B379390750E1d3F802cC220926694D2454903E',
  andCondition: '0x2B07d750C639b65a26e43F1FDCE404b21DCf16D9',
  orCondition: '0x0519a37c0A996DD5F1e81e07b4aD3B24C257BC90',
  notCondition: '0xb9c3223D059C3cAbD482bB54f3d7cD52DE70A9ae',
  hookCombinator: '0x30B5373FD791D2d7b28C3B8020EB68b032f3f960',
  signatureCondition: '0x46Fabd81d294d8589D5c7fCf4276bF966d0b0057',
  refundRequest: '0x15f36140bC1d444f917D306d0f5be223F55709B6',
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
 * `paymentIndexHook` is currently `zeroAddress` because the canonical CREATE2
 * deploy script does not include a chain-singleton `PaymentIndexHook` — it's
 * deployed per-operator (constructor args fold the operator's hook combinator
 * codehash). Consumers can instantiate one via `new PaymentIndexHook(escrow,
 * hookCombinatorCodehash)`. A future canonical singleton may fill this slot.
 */
export const hooks = {
  paymentIndexHook: zeroAddress satisfies Address,
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
// commerce-payments v1 primitives — canonical CREATE2 addresses
// ---------------------------------------------------------------------------
//
// Upstream `base/commerce-payments@v1.0.0` contracts (MIT, vendored unchanged
// in `x402r-contracts/lib/commerce-payments`) deployed at canonical CREATE2
// addresses via CreateX permissionless salts. Salt namespace:
// `commerce-payments::v1::<ContractName>`.

/** AuthCaptureEscrow at canonical CREATE2 address (alias of `authCaptureEscrow`). */
export const commercePaymentsAuthCaptureEscrow = authCaptureEscrow

/** ERC3009PaymentCollector(escrow, multicall3) at canonical CREATE2 address. */
export const commercePaymentsErc3009PaymentCollector =
  '0x7561DC178D9aD5bc5fb103C01f448A510d2A36D0' as const satisfies Address

/** Permit2PaymentCollector(escrow, permit2, multicall3) at canonical CREATE2 address. */
export const commercePaymentsPermit2PaymentCollector =
  '0xD8490609d2da0ee626b0e676941b225cbc1A8C08' as const satisfies Address

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

export const x402rChains = {
  // Testnets
  84532: chainConfig(
    'Base Sepolia',
    84532,
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  ),
  11155111: chainConfig(
    'Ethereum Sepolia',
    11155111,
    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  ),
  421614: chainConfig(
    'Arbitrum Sepolia',
    421614,
    '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  ),

  // Mainnets
  1: chainConfig('Ethereum', 1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  8453: chainConfig('Base', 8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
  137: chainConfig(
    'Polygon',
    137,
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  ),
  42161: chainConfig(
    'Arbitrum One',
    42161,
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  ),
  10: chainConfig('Optimism', 10, '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'),
  42220: chainConfig(
    'Celo',
    42220,
    '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  ),
  43114: chainConfig(
    'Avalanche C-Chain',
    43114,
    '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  ),
  143: chainConfig('Monad', 143, '0x754704Bc059F8C67012fEd69BC8A327a5aafb603'),
  59144: chainConfig(
    'Linea',
    59144,
    '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
  ),
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
