/**
 * Condition deployment helpers for X402r SDK
 * @module deploy/conditions
 */

import type { WalletClient, PublicClient, Address } from "viem";
import type { ConditionConfig, ConditionAddress } from "../conditions/index.js";
import {
  deployAndCondition,
  deployOrCondition,
  deployNotCondition,
  deployStaticAddressCondition,
  type DeploymentResult,
} from "./factories.js";

/**
 * Result from resolving a condition config
 */
export interface ResolveConditionResult {
  /** The final condition address */
  address: Address;
  /** All deployments made during resolution (empty if all existed) */
  deployments: DeploymentResult[];
}

/**
 * Check if a value is a condition address (not a config object)
 */
function isConditionAddress(value: ConditionAddress | ConditionConfig): value is ConditionAddress {
  return typeof value === "string";
}

/**
 * Recursively resolve a condition config to a deployed address
 *
 * This function takes a condition configuration (which may contain nested configs)
 * and deploys all necessary contracts, returning the final condition address.
 *
 * @param walletClient - Viem wallet client with account
 * @param publicClient - Viem public client
 * @param networkId - EIP-155 chain identifier
 * @param config - Condition configuration or existing address
 * @returns The resolved condition address and all deployments made
 *
 * @example
 * ```typescript
 * // Deploy a simple OR condition
 * const result = await resolveConditionConfig(
 *   walletClient,
 *   publicClient,
 *   'eip155:84532',
 *   {
 *     type: 'or',
 *     conditions: [
 *       '0x1234...', // Existing receiver condition
 *       { type: 'staticAddress', designatedAddress: '0xABCD...' }
 *     ]
 *   }
 * );
 * console.log(result.address); // Deployed OrCondition address
 * ```
 *
 * @example
 * ```typescript
 * // Complex nested condition: (Payer AND Arbiter) OR Receiver
 * const helpers = createConditionHelpers('eip155:84532');
 * const result = await resolveConditionConfig(
 *   walletClient,
 *   publicClient,
 *   'eip155:84532',
 *   helpers.or([
 *     helpers.and([
 *       helpers.PAYER,
 *       { type: 'staticAddress', designatedAddress: arbiterAddress }
 *     ]),
 *     helpers.RECEIVER
 *   ])
 * );
 * ```
 */
export async function resolveConditionConfig(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  config: ConditionAddress | ConditionConfig,
): Promise<ResolveConditionResult> {
  const deployments: DeploymentResult[] = [];

  // If it's already an address, return as-is
  if (isConditionAddress(config)) {
    return { address: config, deployments };
  }

  // Handle each config type
  switch (config.type) {
    case "and": {
      // Recursively resolve all child conditions
      const resolvedAddresses: Address[] = [];
      for (const childConfig of config.conditions) {
        const childResult = await resolveConditionConfig(
          walletClient,
          publicClient,
          networkId,
          childConfig,
        );
        resolvedAddresses.push(childResult.address);
        deployments.push(...childResult.deployments);
      }

      // Deploy the AndCondition
      const result = await deployAndCondition(
        walletClient,
        publicClient,
        networkId,
        resolvedAddresses,
      );
      deployments.push(result);

      return { address: result.address, deployments };
    }

    case "or": {
      // Recursively resolve all child conditions
      const resolvedAddresses: Address[] = [];
      for (const childConfig of config.conditions) {
        const childResult = await resolveConditionConfig(
          walletClient,
          publicClient,
          networkId,
          childConfig,
        );
        resolvedAddresses.push(childResult.address);
        deployments.push(...childResult.deployments);
      }

      // Deploy the OrCondition
      const result = await deployOrCondition(
        walletClient,
        publicClient,
        networkId,
        resolvedAddresses,
      );
      deployments.push(result);

      return { address: result.address, deployments };
    }

    case "not": {
      // Recursively resolve the wrapped condition
      const childResult = await resolveConditionConfig(
        walletClient,
        publicClient,
        networkId,
        config.condition,
      );
      deployments.push(...childResult.deployments);

      // Deploy the NotCondition
      const result = await deployNotCondition(
        walletClient,
        publicClient,
        networkId,
        childResult.address,
      );
      deployments.push(result);

      return { address: result.address, deployments };
    }

    case "staticAddress": {
      // Deploy a StaticAddressCondition
      const result = await deployStaticAddressCondition(
        walletClient,
        publicClient,
        networkId,
        config.designatedAddress,
      );
      deployments.push(result);

      return { address: result.address, deployments };
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = config;
      throw new Error(`Unknown condition config type: ${(_exhaustive as ConditionConfig).type}`);
    }
  }
}

/**
 * Preview the address that would result from resolving a condition config
 *
 * This is a read-only operation that computes deterministic addresses
 * without deploying any contracts.
 *
 * @param publicClient - Viem public client
 * @param networkId - EIP-155 chain identifier
 * @param config - Condition configuration or existing address
 * @returns The computed condition address
 */
export async function previewConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  config: ConditionAddress | ConditionConfig,
): Promise<Address> {
  // Import compute functions
  const {
    computeAndConditionAddress,
    computeOrConditionAddress,
    computeNotConditionAddress,
    computeStaticAddressConditionAddress,
  } = await import("./factories.js");

  // If it's already an address, return as-is
  if (isConditionAddress(config)) {
    return config;
  }

  // Handle each config type
  switch (config.type) {
    case "and": {
      const resolvedAddresses: Address[] = [];
      for (const childConfig of config.conditions) {
        const childAddress = await previewConditionAddress(publicClient, networkId, childConfig);
        resolvedAddresses.push(childAddress);
      }
      return computeAndConditionAddress(publicClient, networkId, resolvedAddresses);
    }

    case "or": {
      const resolvedAddresses: Address[] = [];
      for (const childConfig of config.conditions) {
        const childAddress = await previewConditionAddress(publicClient, networkId, childConfig);
        resolvedAddresses.push(childAddress);
      }
      return computeOrConditionAddress(publicClient, networkId, resolvedAddresses);
    }

    case "not": {
      const childAddress = await previewConditionAddress(publicClient, networkId, config.condition);
      return computeNotConditionAddress(publicClient, networkId, childAddress);
    }

    case "staticAddress": {
      return computeStaticAddressConditionAddress(
        publicClient,
        networkId,
        config.designatedAddress,
      );
    }

    default: {
      const _exhaustive: never = config;
      throw new Error(`Unknown condition config type: ${(_exhaustive as ConditionConfig).type}`);
    }
  }
}
