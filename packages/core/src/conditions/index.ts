/**
 * Condition builder for X402r SDK
 * @module conditions
 */

// ============ Types ============

/**
 * Address of a deployed condition contract
 */
export type ConditionAddress = `0x${string}`;

/**
 * AND condition configuration (for deploying AndCondition)
 */
export interface AndConditionConfig {
  type: 'and';
  conditions: (ConditionAddress | ConditionConfig)[];
}

/**
 * OR condition configuration (for deploying OrCondition)
 */
export interface OrConditionConfig {
  type: 'or';
  conditions: (ConditionAddress | ConditionConfig)[];
}

/**
 * NOT condition configuration (for deploying NotCondition)
 */
export interface NotConditionConfig {
  type: 'not';
  condition: ConditionAddress | ConditionConfig;
}

/**
 * StaticAddressCondition configuration
 */
export interface StaticAddressConditionConfig {
  type: 'staticAddress';
  designatedAddress: `0x${string}`;
}

/**
 * Union of all condition configurations
 */
export type ConditionConfig =
  | AndConditionConfig
  | OrConditionConfig
  | NotConditionConfig
  | StaticAddressConditionConfig;

// ============ Singleton Addresses ============

/**
 * Deployed singleton condition addresses
 * These are deployed once and can be reused across all operators
 *
 * @remarks
 * These addresses are placeholders and will be updated with real
 * deployed addresses on each network. Use with NETWORK_CONFIG
 * for network-specific addresses.
 */
export const CONDITION_SINGLETONS = {
  /** PayerCondition singleton - checks if caller is the payer */
  PAYER: '0x0000000000000000000000000000000000000001' as ConditionAddress,
  /** ReceiverCondition singleton - checks if caller is the receiver */
  RECEIVER: '0x0000000000000000000000000000000000000002' as ConditionAddress,
  /** AlwaysTrueCondition singleton - always returns true */
  ALWAYS_TRUE: '0x0000000000000000000000000000000000000003' as ConditionAddress,
} as const;

// ============ Condition Builder ============

/**
 * Helper functions for composing conditions
 *
 * @example
 * ```typescript
 * // Simple: receiver OR designated arbiter
 * const releaseCondition = conditions.or([
 *   conditions.RECEIVER,
 *   arbiterConditionAddress,
 * ]);
 *
 * // Complex: (payer AND arbiter) OR receiver
 * const refundCondition = conditions.or([
 *   conditions.and([conditions.PAYER, arbiterConditionAddress]),
 *   conditions.RECEIVER,
 * ]);
 * ```
 */
export const conditions = {
  /** PayerCondition singleton address */
  get PAYER(): ConditionAddress {
    return CONDITION_SINGLETONS.PAYER;
  },

  /** ReceiverCondition singleton address */
  get RECEIVER(): ConditionAddress {
    return CONDITION_SINGLETONS.RECEIVER;
  },

  /** AlwaysTrueCondition singleton address */
  get ALWAYS_TRUE(): ConditionAddress {
    return CONDITION_SINGLETONS.ALWAYS_TRUE;
  },

  /**
   * Create an AND condition configuration
   * @param conditionList - Array of conditions to combine with AND logic
   * @returns AND condition config for deployment
   */
  and(conditionList: (ConditionAddress | ConditionConfig)[]): AndConditionConfig {
    return {
      type: 'and',
      conditions: conditionList,
    };
  },

  /**
   * Create an OR condition configuration
   * @param conditionList - Array of conditions to combine with OR logic
   * @returns OR condition config for deployment
   */
  or(conditionList: (ConditionAddress | ConditionConfig)[]): OrConditionConfig {
    return {
      type: 'or',
      conditions: conditionList,
    };
  },

  /**
   * Create a NOT condition configuration
   * @param condition - Condition to negate
   * @returns NOT condition config for deployment
   */
  not(condition: ConditionAddress | ConditionConfig): NotConditionConfig {
    return {
      type: 'not',
      condition,
    };
  },

  /**
   * Create a StaticAddressCondition configuration
   * @param designatedAddress - The address that will be allowed
   * @returns StaticAddressCondition config for deployment
   */
  staticAddress(designatedAddress: `0x${string}`): StaticAddressConditionConfig {
    return {
      type: 'staticAddress',
      designatedAddress,
    };
  },
} as const;

// ============ Condition ABIs ============

/**
 * PaymentInfo struct components for condition ABIs
 */
const paymentInfoComponents = [
  { name: 'operator', type: 'address' },
  { name: 'payer', type: 'address' },
  { name: 'receiver', type: 'address' },
  { name: 'token', type: 'address' },
  { name: 'maxAmount', type: 'uint120' },
  { name: 'preApprovalExpiry', type: 'uint48' },
  { name: 'authorizationExpiry', type: 'uint48' },
  { name: 'refundExpiry', type: 'uint48' },
  { name: 'minFeeBps', type: 'uint16' },
  { name: 'maxFeeBps', type: 'uint16' },
  { name: 'feeReceiver', type: 'address' },
  { name: 'salt', type: 'uint256' },
] as const;

/**
 * ICondition interface ABI
 */
export const IConditionABI = [
  {
    type: 'function',
    name: 'check',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
      },
      { name: 'caller', type: 'address' },
    ],
    outputs: [{ name: 'allowed', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

/**
 * PayerCondition ABI (stateless singleton)
 */
export const PayerConditionABI = [
  ...IConditionABI,
] as const;

/**
 * ReceiverCondition ABI (stateless singleton)
 */
export const ReceiverConditionABI = [
  ...IConditionABI,
] as const;

/**
 * AlwaysTrueCondition ABI (stateless singleton)
 */
export const AlwaysTrueConditionABI = [
  ...IConditionABI,
] as const;

/**
 * StaticAddressCondition ABI
 */
export const StaticAddressConditionABI = [
  ...IConditionABI,
  {
    type: 'function',
    name: 'DESIGNATED_ADDRESS',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
] as const;

/**
 * AndCondition ABI
 */
export const AndConditionABI = [
  ...IConditionABI,
  {
    type: 'function',
    name: 'conditions',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'conditionCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_CONDITIONS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
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
 * OrCondition ABI
 */
export const OrConditionABI = [
  ...IConditionABI,
  {
    type: 'function',
    name: 'conditions',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'conditionCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_CONDITIONS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
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
 * NotCondition ABI
 */
export const NotConditionABI = [
  ...IConditionABI,
  {
    type: 'function',
    name: 'CONDITION',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    name: 'ZeroCondition',
    inputs: [],
  },
] as const;
