/**
 * Factory utilities for X402r SDK
 * @module factory
 */

/**
 * Zero address constant
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// ============ Config Types ============

/**
 * Configuration for deploying a PaymentOperator via the factory
 *
 * @example
 * ```typescript
 * const config: PaymentOperatorConfig = {
 *   feeRecipient: '0x...',
 *   feeCalculator: '0x0000000000000000000000000000000000000000', // No operator fee
 *   authorizeCondition: '0x0000000000000000000000000000000000000000',
 *   // ... other fields default to zero address
 * };
 * ```
 */
export interface PaymentOperatorConfig {
  /** Address to receive operator fees */
  feeRecipient: `0x${string}`;
  /** Fee calculator contract (address(0) = no operator fee) */
  feeCalculator: `0x${string}`;
  /** Condition to check before authorize (address(0) = always allow) */
  authorizeCondition: `0x${string}`;
  /** Recorder to call after authorize (address(0) = no-op) */
  authorizeRecorder: `0x${string}`;
  /** Condition to check before charge (address(0) = always allow) */
  chargeCondition: `0x${string}`;
  /** Recorder to call after charge (address(0) = no-op) */
  chargeRecorder: `0x${string}`;
  /** Condition to check before release (address(0) = always allow) */
  releaseCondition: `0x${string}`;
  /** Recorder to call after release (address(0) = no-op) */
  releaseRecorder: `0x${string}`;
  /** Condition to check before refundInEscrow (address(0) = always allow) */
  refundInEscrowCondition: `0x${string}`;
  /** Recorder to call after refundInEscrow (address(0) = no-op) */
  refundInEscrowRecorder: `0x${string}`;
  /** Condition to check before refundPostEscrow (address(0) = always allow) */
  refundPostEscrowCondition: `0x${string}`;
  /** Recorder to call after refundPostEscrow (address(0) = no-op) */
  refundPostEscrowRecorder: `0x${string}`;
}

/**
 * Partial config input for creating PaymentOperatorConfig
 * Only feeRecipient is required; all conditions/recorders default to zero address
 */
export interface PaymentOperatorConfigInput {
  feeRecipient: `0x${string}`;
  feeCalculator?: `0x${string}`;
  authorizeCondition?: `0x${string}`;
  authorizeRecorder?: `0x${string}`;
  chargeCondition?: `0x${string}`;
  chargeRecorder?: `0x${string}`;
  releaseCondition?: `0x${string}`;
  releaseRecorder?: `0x${string}`;
  refundInEscrowCondition?: `0x${string}`;
  refundInEscrowRecorder?: `0x${string}`;
  refundPostEscrowCondition?: `0x${string}`;
  refundPostEscrowRecorder?: `0x${string}`;
}

/**
 * Create a PaymentOperatorConfig with defaults for missing fields
 *
 * @param input - Partial config with required feeRecipient
 * @returns Full PaymentOperatorConfig with zero addresses for unspecified fields
 *
 * @example
 * ```typescript
 * // EscrowPeriod is ONE contract - use same address for recorder AND condition
 * const config = createPaymentOperatorConfig({
 *   feeRecipient: '0x1234...',
 *   authorizeRecorder: escrowPeriodAddress,  // Records authorization timestamp
 *   releaseCondition: escrowPeriodAddress,   // Checks if escrow period passed
 * });
 * ```
 */
export function createPaymentOperatorConfig(input: PaymentOperatorConfigInput): PaymentOperatorConfig {
  return {
    feeRecipient: input.feeRecipient,
    feeCalculator: input.feeCalculator ?? ZERO_ADDRESS,
    authorizeCondition: input.authorizeCondition ?? ZERO_ADDRESS,
    authorizeRecorder: input.authorizeRecorder ?? ZERO_ADDRESS,
    chargeCondition: input.chargeCondition ?? ZERO_ADDRESS,
    chargeRecorder: input.chargeRecorder ?? ZERO_ADDRESS,
    releaseCondition: input.releaseCondition ?? ZERO_ADDRESS,
    releaseRecorder: input.releaseRecorder ?? ZERO_ADDRESS,
    refundInEscrowCondition: input.refundInEscrowCondition ?? ZERO_ADDRESS,
    refundInEscrowRecorder: input.refundInEscrowRecorder ?? ZERO_ADDRESS,
    refundPostEscrowCondition: input.refundPostEscrowCondition ?? ZERO_ADDRESS,
    refundPostEscrowRecorder: input.refundPostEscrowRecorder ?? ZERO_ADDRESS,
  };
}

/**
 * Zero bytes32 constant for authorizedCodehash (allows any operator)
 */
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

/**
 * Configuration for deploying an EscrowPeriod contract
 *
 * @remarks
 * EscrowPeriod is a single contract that implements BOTH IRecorder and ICondition.
 * It records authorization timestamps and checks if the escrow period has passed.
 */
export interface EscrowPeriodConfig {
  /** Duration of the escrow period in seconds */
  escrowPeriod: bigint;
  /** Runtime codehash of authorized caller (bytes32(0) = any operator can record) */
  authorizedCodehash: `0x${string}`;
}

/**
 * Partial config input for creating EscrowPeriodConfig
 */
export interface EscrowPeriodConfigInput {
  escrowPeriod: bigint;
  /** Runtime codehash of authorized caller (defaults to bytes32(0) = any operator) */
  authorizedCodehash?: `0x${string}`;
}

/**
 * Create an EscrowPeriodConfig with defaults for missing fields
 *
 * @param input - Partial config with required escrowPeriod
 * @returns Full EscrowPeriodConfig
 *
 * @example
 * ```typescript
 * // 7 day escrow period, any operator can record
 * const config = createEscrowPeriodConfig({
 *   escrowPeriod: 604800n,
 * });
 * ```
 */
export function createEscrowPeriodConfig(input: EscrowPeriodConfigInput): EscrowPeriodConfig {
  return {
    escrowPeriod: input.escrowPeriod,
    authorizedCodehash: input.authorizedCodehash ?? ZERO_BYTES32,
  };
}

/**
 * Configuration for deploying a FreezePolicy
 */
export interface FreezePolicyConfig {
  /** Condition that authorizes freeze calls */
  freezeCondition: `0x${string}`;
  /** Condition that authorizes unfreeze calls */
  unfreezeCondition: `0x${string}`;
  /** Duration that freezes last (0 = permanent) */
  freezeDuration: bigint;
}

/**
 * Partial config input for creating FreezePolicyConfig
 */
export interface FreezePolicyConfigInput {
  freezeCondition: `0x${string}`;
  unfreezeCondition: `0x${string}`;
  freezeDuration?: bigint;
}

/**
 * Create a FreezePolicyConfig with defaults for missing fields
 *
 * @param input - Partial config with required freeze/unfreeze conditions
 * @returns Full FreezePolicyConfig
 *
 * @example
 * ```typescript
 * // Payer can freeze/unfreeze with 3 day limit
 * const config = createFreezePolicyConfig({
 *   freezeCondition: payerConditionAddress,
 *   unfreezeCondition: payerConditionAddress,
 *   freezeDuration: 259200n, // 3 days
 * });
 * ```
 */
export function createFreezePolicyConfig(input: FreezePolicyConfigInput): FreezePolicyConfig {
  return {
    freezeCondition: input.freezeCondition,
    unfreezeCondition: input.unfreezeCondition,
    freezeDuration: input.freezeDuration ?? 0n,
  };
}

// ============ Factory ABIs ============

/**
 * OperatorConfig struct components for ABI encoding (12 fields total)
 */
const operatorConfigComponents = [
  { name: 'feeRecipient', type: 'address' },
  { name: 'feeCalculator', type: 'address' },
  { name: 'authorizeCondition', type: 'address' },
  { name: 'authorizeRecorder', type: 'address' },
  { name: 'chargeCondition', type: 'address' },
  { name: 'chargeRecorder', type: 'address' },
  { name: 'releaseCondition', type: 'address' },
  { name: 'releaseRecorder', type: 'address' },
  { name: 'refundInEscrowCondition', type: 'address' },
  { name: 'refundInEscrowRecorder', type: 'address' },
  { name: 'refundPostEscrowCondition', type: 'address' },
  { name: 'refundPostEscrowRecorder', type: 'address' },
] as const;

/**
 * ABI for PaymentOperatorFactory contract
 *
 * Key functions:
 * - computeAddress(config) - Get deterministic address before deployment
 * - deployOperator(config) - Deploy operator (idempotent)
 * - getOperator(config) - Get deployed operator address
 */
export const PaymentOperatorFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [
      {
        name: 'config',
        type: 'tuple',
        components: operatorConfigComponents,
      },
    ],
    outputs: [{ name: 'operator', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOperator',
    inputs: [
      {
        name: 'config',
        type: 'tuple',
        components: operatorConfigComponents,
      },
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ESCROW',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PROTOCOL_FEE_CONFIG',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deployOperator',
    inputs: [
      {
        name: 'config',
        type: 'tuple',
        components: operatorConfigComponents,
      },
    ],
    outputs: [{ name: 'operator', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'OperatorDeployed',
    inputs: [
      { name: 'operator', type: 'address', indexed: true },
      { name: 'feeRecipient', type: 'address', indexed: true },
      { name: 'releaseCondition', type: 'address', indexed: false },
    ],
  },
] as const;

/**
 * ABI for EscrowPeriodFactory contract
 *
 * @remarks
 * EscrowPeriod is a SINGLE contract that implements both IRecorder and ICondition.
 * The factory deploys one contract per (escrowPeriod, authorizedCodehash) combination.
 *
 * Key functions:
 * - computeAddress(escrowPeriod, authorizedCodehash) - Get deterministic address
 * - deploy(escrowPeriod, authorizedCodehash) - Deploy EscrowPeriod contract
 * - getDeployed(escrowPeriod, authorizedCodehash) - Get deployed address
 */
export const EscrowPeriodFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'ESCROW',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'authorizedCodehash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'authorizedCodehash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'authorizedCodehash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'deployments',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'authorizedCodehash', type: 'bytes32' },
    ],
    outputs: [{ name: 'escrowPeriodAddr', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'EscrowPeriodDeployed',
    inputs: [
      { name: 'escrowPeriod', type: 'address', indexed: true },
      { name: 'escrowPeriodDuration', type: 'uint256', indexed: false },
    ],
  },
] as const;


/**
 * ABI for FreezePolicyFactory contract
 *
 * Key functions:
 * - computeAddress(freezeCondition, unfreezeCondition, freezeDuration) - Get deterministic address
 * - deploy(freezeCondition, unfreezeCondition, freezeDuration) - Deploy policy
 * - getDeployed(freezeCondition, unfreezeCondition, freezeDuration) - Get deployed address
 */
export const FreezePolicyFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [
      { name: 'freezeCondition', type: 'address' },
      { name: 'unfreezeCondition', type: 'address' },
      { name: 'freezeDuration', type: 'uint256' },
    ],
    outputs: [{ name: 'policy', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [
      { name: 'freezeCondition', type: 'address' },
      { name: 'unfreezeCondition', type: 'address' },
      { name: 'freezeDuration', type: 'uint256' },
    ],
    outputs: [{ name: 'policy', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [
      { name: 'freezeCondition', type: 'address' },
      { name: 'unfreezeCondition', type: 'address' },
      { name: 'freezeDuration', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'policies',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [
      { name: 'freezeCondition', type: 'address' },
      { name: 'unfreezeCondition', type: 'address' },
      { name: 'freezeDuration', type: 'uint256' },
    ],
    outputs: [{ name: 'policy', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'FreezePolicyDeployed',
    inputs: [
      { name: 'policy', type: 'address', indexed: true },
      { name: 'freezeCondition', type: 'address', indexed: false },
      { name: 'unfreezeCondition', type: 'address', indexed: false },
      { name: 'freezeDuration', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * ABI for FreezeFactory contract
 *
 * Deploys Freeze condition contracts that control payment freezing.
 *
 * Key functions:
 * - computeAddress(freezePolicy, escrowPeriodContract) - Get deterministic address
 * - deploy(freezePolicy, escrowPeriodContract) - Deploy Freeze contract
 * - getDeployed(freezePolicy, escrowPeriodContract) - Get deployed address
 */
export const FreezeFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'ESCROW',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [
      { name: 'freezePolicy', type: 'address' },
      { name: 'escrowPeriodContract', type: 'address' },
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [
      { name: 'freezePolicy', type: 'address' },
      { name: 'escrowPeriodContract', type: 'address' },
    ],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [
      { name: 'freezePolicy', type: 'address' },
      { name: 'escrowPeriodContract', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'deployments',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [
      { name: 'freezePolicy', type: 'address' },
      { name: 'escrowPeriodContract', type: 'address' },
    ],
    outputs: [{ name: 'freezeAddr', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'FreezeDeployed',
    inputs: [
      { name: 'freeze', type: 'address', indexed: true },
      { name: 'freezePolicy', type: 'address', indexed: false },
      { name: 'escrowPeriodContract', type: 'address', indexed: false },
    ],
  },
] as const;

/**
 * ABI for StaticFeeCalculatorFactory contract
 *
 * Deploys StaticFeeCalculator contracts for fixed basis point fees.
 *
 * Key functions:
 * - computeAddress(feeBps) - Get deterministic address
 * - deploy(feeBps) - Deploy calculator
 * - getDeployed(feeBps) - Get deployed address
 */
export const StaticFeeCalculatorFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: 'feeBps', type: 'uint256' }],
    outputs: [{ name: 'calculator', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [{ name: 'feeBps', type: 'uint256' }],
    outputs: [{ name: 'calculator', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [{ name: 'feeBps', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'calculators',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [{ name: 'feeBps', type: 'uint256' }],
    outputs: [{ name: 'calculator', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'StaticFeeCalculatorDeployed',
    inputs: [
      { name: 'calculator', type: 'address', indexed: true },
      { name: 'feeBps', type: 'uint256', indexed: false },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'FeeTooHigh',
    inputs: [],
  },
] as const;

/**
 * ABI for StaticAddressConditionFactory contract
 *
 * Deploys StaticAddressCondition contracts that check if caller matches a designated address.
 *
 * Key functions:
 * - computeAddress(designatedAddress) - Get deterministic address
 * - deploy(designatedAddress) - Deploy condition
 * - getDeployed(designatedAddress) - Get deployed address
 */
export const StaticAddressConditionFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: 'designatedAddress', type: 'address' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [{ name: 'designatedAddress', type: 'address' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [{ name: 'designatedAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'conditions',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [{ name: 'designatedAddress', type: 'address' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'StaticAddressConditionDeployed',
    inputs: [
      { name: 'condition', type: 'address', indexed: true },
      { name: 'designatedAddress', type: 'address', indexed: true },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
] as const;

/**
 * ABI for AndConditionFactory contract
 *
 * Deploys AndCondition contracts that combine multiple conditions with AND logic.
 * All child conditions must return true for the combined condition to return true.
 *
 * Key functions:
 * - computeAddress(conditions[]) - Get deterministic address
 * - deploy(conditions[]) - Deploy AndCondition
 * - getDeployed(conditions[]) - Get deployed address
 */
export const AndConditionFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'MAX_CONDITIONS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'conditions',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'AndConditionDeployed',
    inputs: [
      { name: 'condition', type: 'address', indexed: true },
      { name: 'conditions', type: 'address[]', indexed: false },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'NoConditions',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TooManyConditions',
    inputs: [],
  },
] as const;

/**
 * ABI for OrConditionFactory contract
 *
 * Deploys OrCondition contracts that combine multiple conditions with OR logic.
 * At least one child condition must return true for the combined condition to return true.
 *
 * Key functions:
 * - computeAddress(conditions[]) - Get deterministic address
 * - deploy(conditions[]) - Deploy OrCondition
 * - getDeployed(conditions[]) - Get deployed address
 */
export const OrConditionFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'MAX_CONDITIONS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'conditions',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [{ name: '_conditions', type: 'address[]' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'OrConditionDeployed',
    inputs: [
      { name: 'condition', type: 'address', indexed: true },
      { name: 'conditions', type: 'address[]', indexed: false },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'NoConditions',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TooManyConditions',
    inputs: [],
  },
] as const;

/**
 * ABI for NotConditionFactory contract
 *
 * Deploys NotCondition contracts that negate a single condition.
 * Returns the opposite of the wrapped condition's result.
 *
 * Key functions:
 * - computeAddress(condition) - Get deterministic address
 * - deploy(condition) - Deploy NotCondition
 * - getDeployed(condition) - Get deployed address
 */
export const NotConditionFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: '_condition', type: 'address' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [{ name: '_condition', type: 'address' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [{ name: '_condition', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'conditions',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [{ name: '_condition', type: 'address' }],
    outputs: [{ name: 'condition', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'NotConditionDeployed',
    inputs: [
      { name: 'condition', type: 'address', indexed: true },
      { name: 'wrappedCondition', type: 'address', indexed: true },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'ZeroCondition',
    inputs: [],
  },
] as const;

/**
 * ABI for RecorderCombinatorFactory contract
 *
 * Deploys RecorderCombinator contracts that call multiple recorders in sequence.
 *
 * Key functions:
 * - computeAddress(recorders[]) - Get deterministic address
 * - deploy(recorders[]) - Deploy RecorderCombinator
 * - getDeployed(recorders[]) - Get deployed address
 */
export const RecorderCombinatorFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'MAX_RECORDERS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: '_recorders', type: 'address[]' }],
    outputs: [{ name: 'combinator', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [{ name: '_recorders', type: 'address[]' }],
    outputs: [{ name: 'combinator', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [{ name: '_recorders', type: 'address[]' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'combinators',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'deploy',
    inputs: [{ name: '_recorders', type: 'address[]' }],
    outputs: [{ name: 'combinator', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'RecorderCombinatorDeployed',
    inputs: [
      { name: 'combinator', type: 'address', indexed: true },
      { name: 'recorders', type: 'address[]', indexed: false },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'EmptyRecorders',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TooManyRecorders',
    inputs: [],
  },
] as const;
