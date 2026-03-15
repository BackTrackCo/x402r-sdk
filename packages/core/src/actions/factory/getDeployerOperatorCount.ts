import type { Address, PublicClient } from 'viem'
import { paymentOperatorFactoryAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetDeployerOperatorCountParameters {
  factoryAddress: Address
  deployer: Address
}

export async function getDeployerOperatorCount(
  publicClient: PublicClient,
  parameters: GetDeployerOperatorCountParameters,
): Promise<bigint> {
  const { factoryAddress, deployer } = parameters

  return wrapContractCall('getDeployerOperatorCount', () =>
    publicClient.readContract({
      address: factoryAddress,
      abi: paymentOperatorFactoryAbi,
      functionName: 'deployerOperatorCount',
      args: [deployer],
    }),
  )
}
