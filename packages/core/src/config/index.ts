import { type Address, zeroAddress } from 'viem'
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
  recorderCombinator: Address
}

export interface ConditionSingletonAddresses {
  payer: Address
  receiver: Address
  alwaysTrue: Address
}

export interface X402rChainConfig {
  name: string
  chainId: number
  authCaptureEscrow: Address
  tokenCollector: Address
  refundRequest: Address
  protocolFeeConfig: Address
  usdcTvlLimit: Address
  arbiterRegistry: Address
  receiverRefundCollector: Address
  usdc: Address
  refundRequestEvidence?: Address
  factories?: FactoryAddresses
  conditions?: ConditionSingletonAddresses
}

// ---------------------------------------------------------------------------
// Unified CREATE3 addresses (same on every chain)
// ---------------------------------------------------------------------------

const PROTOCOL_ADDRESSES = {
  authCaptureEscrow: '0xe050bb89ed43bb02d71343063824614a7fb80b77',
  tokenCollector: '0xce66ab399eda513bd12760b6427c87d6602344a7',
  refundRequest: '0x45af78aabc0a0dd70f16381cfd6d657ab441b7a0',
  protocolFeeConfig: '0x7e868a42a458fa2443b6259419aa6a8a161e08c8',
  usdcTvlLimit: '0x0f1f26719219cfadc8a1c80d2216098a0534a091',
  arbiterRegistry: '0x1c2d7d5978d46a943fa98ac9a649519c1424fb3e',
  receiverRefundCollector: '0xe5500a38be45a6c598420fbd7867ac85ec451a07',
  refundRequestEvidence: '0xf97aab816b7cbe53025454ad05b03cf5c361f1ba',
  factories: {
    paymentOperator: '0x4d9bc2ba2d0d9afb6b63e3afbbfc95143e6e8da9',
    escrowPeriod: '0x15db06aadeb3a39d47756bf864a173cc48bafe24',
    freeze: '0xdf129effe040c3403aca597c0f0bb704859a78fd',
    staticFeeCalculator: '0x6cddbdb46e2d7caae31a6b213b59a1412d7f16ac',
    staticAddressCondition: '0xfb09350b200fda7ddd06565f5296a0ca625311d5',
    andCondition: '0x5a1f3b6d030d25a2b86aae469ae1216ef3be308d',
    orCondition: '0x101b2fac8cdc6348e541a0ef087275da62aa13a0',
    notCondition: '0x1d58f97843579356863d3393ebe24feed76ceeff',
    recorderCombinator: '0xacf2b5e21cfc14135c9cd43ebe96a481f184c1a1',
  },
  conditions: {
    payer: '0x33f5f1154a02d0839266efd23fd3b85a3505bb4b',
    receiver: '0xf41974a853940ff4c18d46b6565f973c1180e171',
    alwaysTrue: '0xb295df7e7f786fd84d614ab26b1f2e86026c3483',
  },
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
