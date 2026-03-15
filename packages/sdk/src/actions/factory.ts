import {
  getDeployerOperator,
  getDeployerOperatorCount,
  getDeployerOperators,
} from '@x402r/core'
import type { Address } from 'viem'
import type { FactoryActions, ResolvedConfig } from '../types.js'

export function createFactoryActions(config: ResolvedConfig): FactoryActions {
  const factoryAddress = config.chainConfig.factories.paymentOperator

  return {
    getDeployerOperatorCount(deployer: Address): Promise<bigint> {
      return getDeployerOperatorCount(config.publicClient, {
        factoryAddress,
        deployer,
      })
    },
    getDeployerOperator(deployer: Address, index: bigint): Promise<Address> {
      return getDeployerOperator(config.publicClient, {
        factoryAddress,
        deployer,
        index,
      })
    },
    getDeployerOperators(
      deployer: Address,
      offset: bigint,
      count: bigint,
    ): Promise<{ operators: Address[]; total: bigint }> {
      return getDeployerOperators(config.publicClient, {
        factoryAddress,
        deployer,
        offset,
        count,
      })
    },
  }
}
