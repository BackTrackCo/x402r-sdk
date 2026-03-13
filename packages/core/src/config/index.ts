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
  signatureCondition: Address
  signatureRefundRequest: Address
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
  protocolFeeConfig: Address
  usdcTvlLimit: Address
  arbiterRegistry: Address
  receiverRefundCollector: Address
  usdc: Address
  refundRequestEvidence: Address
  factories: FactoryAddresses
  conditions: ConditionSingletonAddresses
}

// ---------------------------------------------------------------------------
// Unified CREATE3 addresses (same on every chain)
// ---------------------------------------------------------------------------

const PROTOCOL_ADDRESSES = {
  authCaptureEscrow: '0xe050bB89eD43BB02d71343063824614A7fb80B77',
  tokenCollector: '0xcE66Ab399EDA513BD12760b6427C87D6602344a7',
  protocolFeeConfig: '0x7e868A42a458fa2443b6259419aA6A8a161E08c8',
  usdcTvlLimit: '0x0F1F26719219CfAdC8a1C80D2216098A0534a091',
  arbiterRegistry: '0x1c2d7d5978d46a943FA98aC9a649519C1424FB3e',
  receiverRefundCollector: '0xE5500a38BE45a6C598420fbd7867ac85EC451A07',
  refundRequestEvidence: '0x1F1272258E49825976B264c3EEBe52bd05d1f186',
  factories: {
    paymentOperator: '0x4D9BC2Ba2D0d9AFb6B63E3afBbfC95143E6E8Da9',
    escrowPeriod: '0x15DB06aADEB3a39D47756Bf864a173cc48bafe24',
    freeze: '0xdf129EFFE040c3403aca597c0F0bb704859a78Fd',
    staticFeeCalculator: '0x6CDdBdB46e2d7Caae31A6b213B59a1412d7f16Ac',
    staticAddressCondition: '0xfB09350b200fda7dDd06565F5296A0CA625311d5',
    andCondition: '0x5a1F3b6d030D25a2B86aAE469Ae1216ef3be308D',
    orCondition: '0x101B2fac8cdC6348E541A0ef087275dA62AA13A0',
    notCondition: '0x1D58f97843579356863d3393ebe24feEd76ceefF',
    recorderCombinator: '0xACf2b5e21CFc14135C9cD43ebE96a481F184C1A1',
    signatureCondition: '0x669B4930f9E72884725F5C7D837Ab9517eA3040f',
    signatureRefundRequest: '0x45af78aaBC0A0dD70f16381CfD6D657Ab441B7a0',
  },
  conditions: {
    payer: '0x33F5F1154A02d0839266EFd23Fd3b85a3505bB4B',
    receiver: '0xF41974A853940Ff4c18d46B6565f973c1180E171',
    alwaysTrue: '0xb295df7E7f786fd84D614AB26b1f2e86026C3483',
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
