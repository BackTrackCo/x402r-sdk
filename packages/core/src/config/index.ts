/**
 * Network configuration for X402r SDK
 * @module config
 */

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
  /** USDC token address */
  usdc: `0x${string}`;
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
    authCaptureEscrow: '0xb33D6502EdBbC47201cd1E53C49d703EC0a660b8',
    tokenCollector: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
    refundRequest: '0x26A3d27139b442Be5ECc10c8608c494627B660BF',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  'eip155:8453': {
    name: 'Base Mainnet',
    chainId: 8453,
    // TODO: Update with deployed contract addresses
    authCaptureEscrow: '0x0000000000000000000000000000000000000000',
    tokenCollector: '0x0000000000000000000000000000000000000000',
    refundRequest: '0x0000000000000000000000000000000000000000',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
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
