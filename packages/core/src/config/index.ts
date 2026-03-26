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
  refundRequest: Address
  refundRequestEvidence: Address
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
  factories: FactoryAddresses
  conditions: ConditionSingletonAddresses
}

// ---------------------------------------------------------------------------
// Unified CREATE3 addresses (same on every chain)
// ---------------------------------------------------------------------------

const PROTOCOL_ADDRESSES = {
  // Unchanged v1 addresses
  authCaptureEscrow: '0xe050bB89eD43BB02d71343063824614A7fb80B77',
  tokenCollector: '0xcE66Ab399EDA513BD12760b6427C87D6602344a7',
  protocolFeeConfig: '0x7e868A42a458fa2443b6259419aA6A8a161E08c8',
  arbiterRegistry: '0x1c2d7d5978d46a943FA98aC9a649519C1424FB3e',
  receiverRefundCollector: '0xE5500a38BE45a6C598420fbd7867ac85EC451A07',
  // v2 addresses (data param, RefundRequest IRecorder, deployer tracking removal)
  usdcTvlLimit: '0x6CAcA05D19312d28787e93ad4249508ED11198be',
  factories: {
    paymentOperator: '0xA13AD07eD53BFF6c4e9e6478C3A8FFA4D096B5A3',
    escrowPeriod: '0xCf84F213d6e1b2E2dc0DbCBd7d81FaAC305d4E96',
    freeze: '0xaf6700833bf414BEde7d450f9c6772e2FE76B21d',
    staticFeeCalculator: '0x83B94258Daa50Dd08aED72e0Cda1daCC20286F52',
    staticAddressCondition: '0xf9739BB422C93A9705cC636BA9D35B97F721e782',
    andCondition: '0x57d33f001a0d880Ca9e53e578c55CA74baB5C36A',
    orCondition: '0xefaD31Ab2a17092Bb4350C84324D59C80CeBB9F4',
    notCondition: '0x8FE9EDE9a786e613723922aB9f512F54DAEfE3A8',
    recorderCombinator: '0x60C1492fbB1A53F5d968Ad6FDFA6b7672Bc6a34c',
    signatureCondition: '0x99F11e8b407dAc9BCBf40B869D35071D74FE56f4',
    refundRequest: '0x7996b1E7B5B28AF85093dcE3AE73b128133D3715',
    refundRequestEvidence: '0xa454D7e0D521176c998309E4E6828156870EDf4B',
  },
  conditions: {
    payer: '0xc321156210E9c2D135454290dc13ca7A1A7533C6',
    receiver: '0xd14242a812F9C7C81869F01867453e571cacEaba',
    alwaysTrue: '0x27E1576D4C7C5A6Ee919CB456f2284026177e9c6',
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

  1187947933: chainConfig(
    'SKALE Base',
    1187947933,
    '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20',
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
