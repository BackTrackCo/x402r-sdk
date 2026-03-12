import type { Address, PublicClient, WalletClient } from 'viem'
import type {
  ConditionSingletonAddresses,
  FactoryAddresses,
} from '../config/index.js'
import {
  computeAndConditionAddress,
  computeNotConditionAddress,
  computeOrConditionAddress,
  computeStaticAddressConditionAddress,
  deployAndCondition,
  deployNotCondition,
  deployOrCondition,
  deployStaticAddressCondition,
} from './factories.js'
import type { DeployResult } from './factory-helpers.js'

// ---------------------------------------------------------------------------
// Condition DSL types
// ---------------------------------------------------------------------------

export interface AndConditionInput {
  type: 'and'
  conditions: readonly ConditionInput[]
}

export interface OrConditionInput {
  type: 'or'
  conditions: readonly ConditionInput[]
}

export interface NotConditionInput {
  type: 'not'
  condition: ConditionInput
}

export interface StaticAddressConditionInput {
  type: 'staticAddress'
  designatedAddress: Address
}

export type ConditionInput =
  | Address
  | AndConditionInput
  | OrConditionInput
  | NotConditionInput
  | StaticAddressConditionInput

// ---------------------------------------------------------------------------
// Condition resolution result
// ---------------------------------------------------------------------------

export interface ConditionResolution {
  address: Address
  deployments: DeployResult[]
}

// ---------------------------------------------------------------------------
// createConditionHelpers — pure builder for condition DSL
// ---------------------------------------------------------------------------

export function createConditionHelpers(
  singletons: ConditionSingletonAddresses,
) {
  return {
    PAYER: singletons.payer,
    RECEIVER: singletons.receiver,
    ALWAYS_TRUE: singletons.alwaysTrue,

    and(...conditions: ConditionInput[]): AndConditionInput {
      return { type: 'and', conditions }
    },

    or(...conditions: ConditionInput[]): OrConditionInput {
      return { type: 'or', conditions }
    },

    not(condition: ConditionInput): NotConditionInput {
      return { type: 'not', condition }
    },

    staticAddress(designatedAddress: Address): StaticAddressConditionInput {
      return { type: 'staticAddress', designatedAddress }
    },
  }
}

// ---------------------------------------------------------------------------
// resolveCondition — recursive deploy of condition tree
// ---------------------------------------------------------------------------

export async function resolveCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddresses: FactoryAddresses,
  input: ConditionInput,
): Promise<ConditionResolution> {
  // Plain address — no deploy needed
  if (typeof input === 'string') {
    return { address: input, deployments: [] }
  }

  const node = input as Exclude<ConditionInput, Address>

  switch (node.type) {
    case 'staticAddress': {
      const result = await deployStaticAddressCondition(
        walletClient,
        publicClient,
        {
          factoryAddress: factoryAddresses.staticAddressCondition,
          designatedAddress: node.designatedAddress,
        },
      )
      return { address: result.address, deployments: [result] }
    }

    case 'and': {
      // Resolve children sequentially for deterministic transaction ordering
      const childAddresses: Address[] = []
      const allDeployments: DeployResult[] = []
      for (const child of node.conditions) {
        const resolved = await resolveCondition(
          walletClient,
          publicClient,
          factoryAddresses,
          child,
        )
        childAddresses.push(resolved.address)
        allDeployments.push(...resolved.deployments)
      }
      const result = await deployAndCondition(walletClient, publicClient, {
        factoryAddress: factoryAddresses.andCondition,
        conditions: childAddresses,
      })
      return {
        address: result.address,
        deployments: [...allDeployments, result],
      }
    }

    case 'or': {
      const childAddresses: Address[] = []
      const allDeployments: DeployResult[] = []
      for (const child of node.conditions) {
        const resolved = await resolveCondition(
          walletClient,
          publicClient,
          factoryAddresses,
          child,
        )
        childAddresses.push(resolved.address)
        allDeployments.push(...resolved.deployments)
      }
      const result = await deployOrCondition(walletClient, publicClient, {
        factoryAddress: factoryAddresses.orCondition,
        conditions: childAddresses,
      })
      return {
        address: result.address,
        deployments: [...allDeployments, result],
      }
    }

    case 'not': {
      const child = await resolveCondition(
        walletClient,
        publicClient,
        factoryAddresses,
        node.condition,
      )
      const result = await deployNotCondition(walletClient, publicClient, {
        factoryAddress: factoryAddresses.notCondition,
        condition: child.address,
      })
      return {
        address: result.address,
        deployments: [...child.deployments, result],
      }
    }

    default: {
      const _exhaustive: never = node
      throw new Error(
        `Unknown condition type: ${(_exhaustive as { type: string }).type}`,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// previewConditionAddress — read-only address computation
// ---------------------------------------------------------------------------

export async function previewConditionAddress(
  publicClient: PublicClient,
  factoryAddresses: FactoryAddresses,
  input: ConditionInput,
): Promise<Address> {
  // Plain address — return as-is
  if (typeof input === 'string') {
    return input
  }

  const node = input as Exclude<ConditionInput, Address>

  switch (node.type) {
    case 'staticAddress': {
      return computeStaticAddressConditionAddress(publicClient, {
        factoryAddress: factoryAddresses.staticAddressCondition,
        designatedAddress: node.designatedAddress,
      })
    }

    case 'and': {
      const childAddresses = await Promise.all(
        node.conditions.map((child) =>
          previewConditionAddress(publicClient, factoryAddresses, child),
        ),
      )
      return computeAndConditionAddress(publicClient, {
        factoryAddress: factoryAddresses.andCondition,
        conditions: childAddresses,
      })
    }

    case 'or': {
      const childAddresses = await Promise.all(
        node.conditions.map((child) =>
          previewConditionAddress(publicClient, factoryAddresses, child),
        ),
      )
      return computeOrConditionAddress(publicClient, {
        factoryAddress: factoryAddresses.orCondition,
        conditions: childAddresses,
      })
    }

    case 'not': {
      const childAddress = await previewConditionAddress(
        publicClient,
        factoryAddresses,
        node.condition,
      )
      return computeNotConditionAddress(publicClient, {
        factoryAddress: factoryAddresses.notCondition,
        condition: childAddress,
      })
    }

    default: {
      const _exhaustive: never = node
      throw new Error(
        `Unknown condition type: ${(_exhaustive as { type: string }).type}`,
      )
    }
  }
}
