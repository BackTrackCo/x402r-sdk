/**
 * Condition builder for X402r SDK
 * @module conditions
 */

// Import network config helpers
import { getConditionSingletons as getNetworkConditionSingletons } from "../config/index.js";

// ============ Types ============

/**
 * Address of a deployed condition contract
 */
export type ConditionAddress = `0x${string}`;

/**
 * AND condition configuration (for deploying AndCondition)
 */
export interface AndConditionConfig {
  type: "and";
  conditions: (ConditionAddress | ConditionConfig)[];
}

/**
 * OR condition configuration (for deploying OrCondition)
 */
export interface OrConditionConfig {
  type: "or";
  conditions: (ConditionAddress | ConditionConfig)[];
}

/**
 * NOT condition configuration (for deploying NotCondition)
 */
export interface NotConditionConfig {
  type: "not";
  condition: ConditionAddress | ConditionConfig;
}

/**
 * StaticAddressCondition configuration
 */
export interface StaticAddressConditionConfig {
  type: "staticAddress";
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

// ============ Condition Builder ============

/**
 * Create a network-aware condition helper
 *
 * @param networkId - EIP-155 chain identifier
 * @returns Condition helper with network-specific singleton addresses
 *
 * @example
 * ```typescript
 * const conditions = createConditionHelpers('eip155:84532');
 *
 * // Use network-specific singleton addresses
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
export function createConditionHelpers(networkId: string) {
  const singletons = getNetworkConditionSingletons(networkId);

  return {
    /** PayerCondition singleton address for this network */
    get PAYER(): ConditionAddress {
      return singletons.payer;
    },

    /** ReceiverCondition singleton address for this network */
    get RECEIVER(): ConditionAddress {
      return singletons.receiver;
    },

    /** AlwaysTrueCondition singleton address for this network */
    get ALWAYS_TRUE(): ConditionAddress {
      return singletons.alwaysTrue;
    },

    /**
     * Create an AND condition configuration
     * @param conditionList - Array of conditions to combine with AND logic
     * @returns AND condition config for deployment
     */
    and(conditionList: (ConditionAddress | ConditionConfig)[]): AndConditionConfig {
      return {
        type: "and",
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
        type: "or",
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
        type: "not",
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
        type: "staticAddress",
        designatedAddress,
      };
    },
  } as const;
}
