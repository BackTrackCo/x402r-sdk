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

export interface RecorderSingletonAddresses {
  /** PaymentIndexRecorder(escrow, recorderCombinatorCodehash) — deploy once, share across operators */
  paymentIndexRecorder: Address
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
  recorders: RecorderSingletonAddresses
  /** Runtime codehash of RecorderCombinator contract (same for all instances) */
  recorderCombinatorCodehash: Hex
}

// ---------------------------------------------------------------------------
// Unified CREATE3 addresses (same on every chain)
// ---------------------------------------------------------------------------

export const authCaptureEscrow =
  '0xBC151792f80C0EB1973d56b0235e6bee2A60e245' as const satisfies Address
export const tokenCollector =
  '0x9A12A116a44636F55c9e135189A1321Abcfe2f30' as const satisfies Address
export const protocolFeeConfig =
  '0xf62788834C99B2E85a6891C0b46D1EB996f8f596' as const satisfies Address
export const arbiterRegistry =
  '0xdd3954f83CF6D65B07A8a88B117300AE73602333' as const satisfies Address
export const receiverRefundCollector =
  '0x2C0eC8B33196071cA6d08299844235fD81e1466A' as const satisfies Address
export const usdcTvlLimit =
  '0x96a585F0e23eE9FD8722C7a61d3b8B3FAd2419df' as const satisfies Address

/** Chain-invariant CREATE3 factory addresses. Same as `getChainConfig(chainId).factories`. */
export const factories = {
  paymentOperator: '0x3Cd5c76Fefe46CB07788Ee8f80B93B20D81941D4',
  escrowPeriod: '0x22E42a1bC9Fc64ab77E4Bb9968b105034a978bfb',
  freeze: '0x67657BefCd872A3AF36F437D53b2D4722392a940',
  staticFeeCalculator: '0x8a9C93F3401A5C712bEd8A52436Ac09cD9aFe2De',
  staticAddressCondition: '0xE606cA9568c92115a3Deb76E9f3891BEfac141f3',
  andCondition: '0x6c3c57071C0Ac144D04e6C66BC809d2951dDF47D',
  orCondition: '0x3dF6b5B840989Ce466161C31A49b8FadF2DA52E5',
  notCondition: '0x269Db5f049A7225E4968Ef7Dee885922da0B8D73',
  recorderCombinator: '0xb7571b80C24Ce81C65F6b322a75573B61327cA23',
  signatureCondition: '0xc34EFa7C20940dc2aB50bE23eF150D8B87aEFAc3',
  refundRequest: '0x69e9BF2b40Ed472b55E47e9D4205d93Ed673093F',
  refundRequestEvidence: '0x6514e417f48c1828A2443C6173fa6E04324166E3',
} as const satisfies FactoryAddresses

/** Chain-invariant CREATE3 condition singleton addresses. Same as `getChainConfig(chainId).conditions`. */
export const conditions = {
  payer: '0x808bB293AE1473A38Dd4017afa3db941924fD0F3',
  receiver: '0xB82697792e5Fcd644bDEAB23aa4e4511d9024C17',
  alwaysTrue: '0xA367323189f20706488A1D83430eda82a2eA5320',
} as const satisfies ConditionSingletonAddresses

/** Chain-invariant CREATE3 recorder singleton addresses. Same as `getChainConfig(chainId).recorders`. */
export const recorders = {
  paymentIndexRecorder: zeroAddress,
} as const satisfies RecorderSingletonAddresses

/**
 * Runtime codehash of RecorderCombinator contract.
 * All RecorderCombinator instances share identical runtime bytecode —
 * constructor args affect storage, not deployed code.
 * Computed via: forge script script/ComputeCodehash.s.sol
 */
export const recorderCombinatorCodehash: Hex =
  '0x489c83194f171a41ed97057e542ffb877d7a787f7888341ee379288f4f02691e'

const PROTOCOL_ADDRESSES = {
  authCaptureEscrow,
  tokenCollector,
  protocolFeeConfig,
  arbiterRegistry,
  receiverRefundCollector,
  usdcTvlLimit,
  factories,
  conditions,
  recorders,
  recorderCombinatorCodehash,
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

export function getRecorderSingletons(
  chainId: number,
): RecorderSingletonAddresses {
  const config = getChainConfig(chainId)
  return config.recorders
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
