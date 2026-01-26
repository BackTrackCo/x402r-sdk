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
 *   authorizeCondition: '0x0000000000000000000000000000000000000000',
 *   // ... other fields default to zero address
 * };
 * ```
 */
export interface PaymentOperatorConfig {
  /** Address to receive operator fees */
  feeRecipient: `0x${string}`;
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
 * const config = createPaymentOperatorConfig({
 *   feeRecipient: '0x1234...',
 *   releaseCondition: escrowPeriodConditionAddress,
 *   releaseRecorder: escrowPeriodRecorderAddress,
 * });
 * ```
 */
export function createPaymentOperatorConfig(input: PaymentOperatorConfigInput): PaymentOperatorConfig {
  return {
    feeRecipient: input.feeRecipient,
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
 * Configuration for deploying EscrowPeriodRecorder and EscrowPeriodCondition
 */
export interface EscrowPeriodConfig {
  /** Duration of the escrow period in seconds */
  escrowPeriod: bigint;
  /** Address of the freeze policy (address(0) = no freeze capability) */
  freezePolicy: `0x${string}`;
}

/**
 * Partial config input for creating EscrowPeriodConfig
 */
export interface EscrowPeriodConfigInput {
  escrowPeriod: bigint;
  freezePolicy?: `0x${string}`;
}

/**
 * Create an EscrowPeriodConfig with defaults for missing fields
 *
 * @param input - Partial config with required escrowPeriod
 * @returns Full EscrowPeriodConfig
 *
 * @example
 * ```typescript
 * // 7 day escrow period without freeze
 * const config = createEscrowPeriodConfig({
 *   escrowPeriod: 604800n,
 * });
 * ```
 */
export function createEscrowPeriodConfig(input: EscrowPeriodConfigInput): EscrowPeriodConfig {
  return {
    escrowPeriod: input.escrowPeriod,
    freezePolicy: input.freezePolicy ?? ZERO_ADDRESS,
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
 * OperatorConfig struct components for ABI encoding
 */
const operatorConfigComponents = [
  { name: 'feeRecipient', type: 'address' },
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
    name: 'PROTOCOL_FEE_RECIPIENT',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_TOTAL_FEE_RATE',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PROTOCOL_FEE_PERCENTAGE',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
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
 * ABI for EscrowPeriodConditionFactory contract
 *
 * Key functions:
 * - computeAddresses(escrowPeriod, freezePolicy) - Get deterministic addresses
 * - deploy(escrowPeriod, freezePolicy) - Deploy recorder and condition pair
 * - getDeployed(escrowPeriod, freezePolicy) - Get deployed addresses
 */
export const EscrowPeriodConditionFactoryABI = [
  // View functions
  {
    type: 'function',
    name: 'computeAddresses',
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'freezePolicy', type: 'address' },
    ],
    outputs: [
      { name: 'recorder', type: 'address' },
      { name: 'condition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeployed',
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'freezePolicy', type: 'address' },
    ],
    outputs: [
      { name: 'recorder', type: 'address' },
      { name: 'condition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKey',
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'freezePolicy', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'recorders',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
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
    inputs: [
      { name: 'escrowPeriod', type: 'uint256' },
      { name: 'freezePolicy', type: 'address' },
    ],
    outputs: [
      { name: 'recorder', type: 'address' },
      { name: 'condition', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'EscrowPeriodConditionDeployed',
    inputs: [
      { name: 'condition', type: 'address', indexed: true },
      { name: 'recorder', type: 'address', indexed: false },
      { name: 'escrowPeriod', type: 'uint256', indexed: false },
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
