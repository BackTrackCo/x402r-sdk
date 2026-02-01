/**
 * Network configuration for X402r SDK
 * @module config
 */

/**
 * Factory addresses for deploying protocol components
 */
export interface FactoryAddresses {
  /** PaymentOperatorFactory address */
  paymentOperator: `0x${string}`;
  /** EscrowPeriodFactory address */
  escrowPeriod: `0x${string}`;
  /** FreezePolicyFactory address */
  freezePolicy: `0x${string}`;
  /** FreezeFactory address */
  freeze: `0x${string}`;
  /** StaticFeeCalculatorFactory address */
  staticFeeCalculator: `0x${string}`;
  /** StaticAddressConditionFactory address */
  staticAddressCondition: `0x${string}`;
}

/**
 * Condition singleton addresses (deployed once per network)
 */
export interface ConditionSingletonAddresses {
  /** PayerCondition singleton - checks if caller is the payer */
  payer: `0x${string}`;
  /** ReceiverCondition singleton - checks if caller is the receiver */
  receiver: `0x${string}`;
  /** AlwaysTrueCondition singleton - always returns true */
  alwaysTrue: `0x${string}`;
}

/**
 * Network configuration interface containing deployed contract addresses
 */
export interface NetworkConfig {
  /** Human-readable network name */
  name: string;
  /** Numeric chain ID */
  chainId: number;
  /** AuthCaptureEscrow contract address */
  authCaptureEscrow: `0x${string}`;
  /** TokenCollector contract address */
  tokenCollector: `0x${string}`;
  /** RefundRequest contract address */
  refundRequest: `0x${string}`;
  /** ProtocolFeeConfig contract address */
  protocolFeeConfig: `0x${string}`;
  /** USDC token address */
  usdc: `0x${string}`;
  /** Factory addresses (optional - may not be deployed on all networks) */
  factories?: FactoryAddresses;
  /** Condition singleton addresses (optional - may not be deployed on all networks) */
  conditions?: ConditionSingletonAddresses;
}

/**
 * Network configuration by EIP-155 chain identifier
 *
 * @example
 * ```typescript
 * const baseSepolia = NETWORK_CONFIG['eip155:84532'];
 * console.log(baseSepolia.name); // 'Base Sepolia'
 * ```
 */
export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  'eip155:84532': {
    name: 'Base Sepolia',
    chainId: 84532,
    authCaptureEscrow: '0xb9488351E48b23D798f24e8174514F28B741Eb4f',
    tokenCollector: '0xC80cd08d609673061597DE7fe54Af3978f10A825',
    refundRequest: '0x6926c05193c714ED4bA3867Ee93d6816Fdc14128',
    protocolFeeConfig: '0x1e52a74cE6b69F04a506eF815743E1052A1BD28F',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    factories: {
      paymentOperator: '0xFa8C4Cb156053b867Ae7489220A29b5939E3Df70',
      escrowPeriod: '0x206D4DbB6E7b876e4B5EFAAD2a04e7d7813FB6ba',
      freezePolicy: '0x9D4146EF898c8E60B3e865AE254ef438E7cEd2A0',
      freeze: '0x5b3e33791C1764cF7e2573Bf8116F1D361FD97Cd',
      staticFeeCalculator: '0x35fb2EFEfAc3Ee9f6E52A9AAE5C9655bC08dEc00',
      staticAddressCondition: '0x68684ff8CD38483B8023a1443Af97C58eD29Cb06',
    },
    conditions: {
      payer: '0xBAF68176FF94CAdD403EF7FbB776bbca548AC09D',
      receiver: '0x12EDefd4549c53497689067f165c0f101796Eb6D',
      alwaysTrue: '0x785cC83DEa3d46D5509f3bf7496EAb26D42EE610',
    },
  },
  'eip155:8453': {
    name: 'Base Mainnet',
    chainId: 8453,
    // TODO: Update with deployed contract addresses after mainnet deployment
    authCaptureEscrow: '0x0000000000000000000000000000000000000000',
    tokenCollector: '0x0000000000000000000000000000000000000000',
    refundRequest: '0x0000000000000000000000000000000000000000',
    protocolFeeConfig: '0x0000000000000000000000000000000000000000',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    // factories and conditions not yet deployed on mainnet
  },
};

/**
 * List of supported network identifiers
 *
 * @example
 * ```typescript
 * SupportedNetworks.forEach(network => {
 *   console.log(network); // 'eip155:84532'
 * });
 * ```
 */
export const SupportedNetworks = Object.keys(NETWORK_CONFIG);

/**
 * Get network configuration by EIP-155 chain identifier
 *
 * @param networkId - EIP-155 chain identifier (e.g., 'eip155:84532')
 * @returns Network configuration or undefined if not supported
 *
 * @example
 * ```typescript
 * const config = getNetworkConfig('eip155:84532');
 * if (config) {
 *   console.log(config.authCaptureEscrow);
 * }
 * ```
 */
export function getNetworkConfig(networkId: string): NetworkConfig | undefined {
  return NETWORK_CONFIG[networkId];
}

/**
 * Check if a network is supported
 *
 * @param networkId - EIP-155 chain identifier to check
 * @returns true if the network is supported
 *
 * @example
 * ```typescript
 * if (isSupportedNetwork('eip155:84532')) {
 *   // Safe to use this network
 * }
 * ```
 */
export function isSupportedNetwork(networkId: string): boolean {
  return networkId in NETWORK_CONFIG;
}

/**
 * Zero address constant for checking if addresses are deployed
 */
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Check if an address is a valid deployed address (not zero)
 */
function isDeployedAddress(address: `0x${string}`): boolean {
  return address !== ZERO_ADDRESS;
}

/**
 * Get factory addresses for a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns Factory addresses or throws if not available
 * @throws Error if factories are not deployed on the network
 *
 * @example
 * ```typescript
 * const factories = getFactoryAddresses('eip155:84532');
 * console.log(factories.paymentOperator);
 * ```
 */
export function getFactoryAddresses(networkId: string): FactoryAddresses {
  const config = getNetworkConfig(networkId);
  if (!config) {
    throw new Error(`Network ${networkId} is not supported`);
  }
  if (!config.factories) {
    throw new Error(`Factories are not deployed on ${config.name}`);
  }
  return config.factories;
}

/**
 * Get a specific factory address, with validation
 *
 * @param networkId - EIP-155 chain identifier
 * @param factory - Factory name to get
 * @returns Factory address
 * @throws Error if factory is not deployed
 *
 * @example
 * ```typescript
 * const operatorFactory = getFactoryAddress('eip155:84532', 'paymentOperator');
 * ```
 */
export function getFactoryAddress(
  networkId: string,
  factory: keyof FactoryAddresses
): `0x${string}` {
  const factories = getFactoryAddresses(networkId);
  const address = factories[factory];
  if (!isDeployedAddress(address)) {
    const config = getNetworkConfig(networkId);
    throw new Error(`${factory} factory is not deployed on ${config?.name ?? networkId}`);
  }
  return address;
}

/**
 * Get condition singleton addresses for a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns Condition singleton addresses or throws if not available
 * @throws Error if conditions are not deployed on the network
 *
 * @example
 * ```typescript
 * const conditions = getConditionSingletons('eip155:84532');
 * console.log(conditions.payer);
 * ```
 */
export function getConditionSingletons(networkId: string): ConditionSingletonAddresses {
  const config = getNetworkConfig(networkId);
  if (!config) {
    throw new Error(`Network ${networkId} is not supported`);
  }
  if (!config.conditions) {
    throw new Error(`Condition singletons are not deployed on ${config.name}`);
  }
  // Validate that addresses are actually deployed
  const { payer, receiver, alwaysTrue } = config.conditions;
  if (!isDeployedAddress(payer) || !isDeployedAddress(receiver) || !isDeployedAddress(alwaysTrue)) {
    throw new Error(
      `Condition singletons are not fully deployed on ${config.name}. ` +
      `This is a protocol-level deployment - contact the x402r team.`
    );
  }
  return config.conditions;
}

/**
 * Check if factories are available on a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns true if factories are deployed
 */
export function hasFactories(networkId: string): boolean {
  const config = getNetworkConfig(networkId);
  return !!config?.factories;
}

/**
 * Check if condition singletons are available on a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns true if condition singletons are deployed
 */
export function hasConditionSingletons(networkId: string): boolean {
  const config = getNetworkConfig(networkId);
  if (!config?.conditions) return false;
  const { payer, receiver, alwaysTrue } = config.conditions;
  return isDeployedAddress(payer) && isDeployedAddress(receiver) && isDeployedAddress(alwaysTrue);
}
