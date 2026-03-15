import type { Address, PublicClient } from 'viem'
import { paymentOperatorFactoryAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetDeployerOperatorsParameters {
  factoryAddress: Address
  deployer: Address
  offset: bigint
  count: bigint
}

export interface GetDeployerOperatorsReturnType {
  operators: Address[]
  total: bigint
}

export async function getDeployerOperators(
  publicClient: PublicClient,
  parameters: GetDeployerOperatorsParameters,
): Promise<GetDeployerOperatorsReturnType> {
  const { factoryAddress, deployer, offset, count } = parameters

  const [operators, total] = await wrapContractCall(
    'getDeployerOperators',
    () =>
      publicClient.readContract({
        address: factoryAddress,
        abi: paymentOperatorFactoryAbi,
        functionName: 'getDeployerOperators',
        args: [deployer, offset, count],
      }),
  )

  return { operators: [...operators], total }
}
