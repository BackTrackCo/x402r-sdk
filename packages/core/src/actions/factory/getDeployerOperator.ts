import type { Address, PublicClient } from 'viem'
import { paymentOperatorFactoryAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetDeployerOperatorParameters {
  factoryAddress: Address
  deployer: Address
  index: bigint
}

export async function getDeployerOperator(
  publicClient: PublicClient,
  parameters: GetDeployerOperatorParameters,
): Promise<Address> {
  const { factoryAddress, deployer, index } = parameters

  return wrapContractCall('getDeployerOperator', () =>
    publicClient.readContract({
      address: factoryAddress,
      abi: paymentOperatorFactoryAbi,
      functionName: 'getDeployerOperator',
      args: [deployer, index],
    }),
  )
}
