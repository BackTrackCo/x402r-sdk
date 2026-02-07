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
  /** FreezeFactory address */
  freeze: `0x${string}`;
  /** StaticFeeCalculatorFactory address */
  staticFeeCalculator: `0x${string}`;
  /** StaticAddressConditionFactory address */
  staticAddressCondition: `0x${string}`;
  /** AndConditionFactory address */
  andCondition: `0x${string}`;
  /** OrConditionFactory address */
  orCondition: `0x${string}`;
  /** NotConditionFactory address */
  notCondition: `0x${string}`;
  /** RecorderCombinatorFactory address */
  recorderCombinator: `0x${string}`;
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
  /** UsdcTvlLimit condition contract address */
  usdcTvlLimit: `0x${string}`;
  /** ArbiterRegistry contract address */
  arbiterRegistry: `0x${string}`;
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
  "eip155:84532": {
    name: "Base Sepolia",
    chainId: 84532,
    authCaptureEscrow: "0xb9488351E48b23D798f24e8174514F28B741Eb4f",
    tokenCollector: "0xC80cd08d609673061597DE7fe54Af3978f10A825",
    refundRequest: "0x6926c05193c714ED4bA3867Ee93d6816Fdc14128",
    protocolFeeConfig: "0x99FcEd5517879878518994B79B253198f41490F7",
    usdcTvlLimit: "0xd524fE1DFA0ED5105883AB928E4F6e3F37AC3fDD",
    arbiterRegistry: "0xFcE18CB2f44a85D043E5F86f200dfFc9649622DF",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    factories: {
      paymentOperator: "0xe01CEd771A30A23a7A4C9c1db604C74D4Dc4ebe8",
      escrowPeriod: "0x206D4DbB6E7b876e4B5EFAAD2a04e7d7813FB6ba",
      freeze: "0x199fed16577773Bb6b2D76CC3cD1c76c22D28835",
      staticFeeCalculator: "0x35fb2EFEfAc3Ee9f6E52A9AAE5C9655bC08dEc00",
      staticAddressCondition: "0x68684ff8CD38483B8023a1443Af97C58eD29Cb06",
      andCondition: "0xF8989eA1ECc5be2d369860cec23Ee0B9e1558714",
      orCondition: "0x6293Ab0503411392f7f46671595D97C8CAfe321c",
      notCondition: "0xEb2615951d0F0781B1D94e028120414f237BD74c",
      recorderCombinator: "0x31E6E25bc97187A102E1a64D2A495a287F95Cdd6",
    },
    conditions: {
      payer: "0xBAF68176FF94CAdD403EF7FbB776bbca548AC09D",
      receiver: "0x12EDefd4549c53497689067f165c0f101796Eb6D",
      alwaysTrue: "0x785cC83DEa3d46D5509f3bf7496EAb26D42EE610",
    },
  },
  "eip155:8453": {
    name: "Base Mainnet",
    chainId: 8453,
    authCaptureEscrow: "0x320a3c35F131E5D2Fb36af56345726B298936037",
    tokenCollector: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
    refundRequest: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    protocolFeeConfig: "0x19a798c7F66E6401f6004b732dA604196952e843",
    usdcTvlLimit: "0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a",
    arbiterRegistry: "0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    factories: {
      paymentOperator: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
      escrowPeriod: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      freeze: "0xCAEd9474c06bf9139AC36C874dED838e1Bcb9310",
      staticFeeCalculator: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      staticAddressCondition: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
      andCondition: "0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a",
      orCondition: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      notCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      recorderCombinator: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
    },
    conditions: {
      payer: "0xb33D6502EdBbC47201cd1E53C49d703EC0a660b8",
      receiver: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
      alwaysTrue: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
    },
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
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

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
  factory: keyof FactoryAddresses,
): `0x${string}` {
  const factories = getFactoryAddresses(networkId);
  const address = factories[factory];
  if (!isDeployedAddress(address)) {
    const config = getNetworkConfig(networkId);
    throw new Error(
      `${factory} factory is not deployed on ${config?.name ?? networkId}`,
    );
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
export function getConditionSingletons(
  networkId: string,
): ConditionSingletonAddresses {
  const config = getNetworkConfig(networkId);
  if (!config) {
    throw new Error(`Network ${networkId} is not supported`);
  }
  if (!config.conditions) {
    throw new Error(`Condition singletons are not deployed on ${config.name}`);
  }
  // Validate that addresses are actually deployed
  const { payer, receiver, alwaysTrue } = config.conditions;
  if (
    !isDeployedAddress(payer) ||
    !isDeployedAddress(receiver) ||
    !isDeployedAddress(alwaysTrue)
  ) {
    throw new Error(
      `Condition singletons are not fully deployed on ${config.name}. ` +
        `This is a protocol-level deployment - contact the x402r team.`,
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
  return (
    isDeployedAddress(payer) &&
    isDeployedAddress(receiver) &&
    isDeployedAddress(alwaysTrue)
  );
}
