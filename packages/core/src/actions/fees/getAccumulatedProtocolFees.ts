import type { Address, PublicClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetAccumulatedProtocolFeesParameters {
  operatorAddress: Address
  token: Address
}
export type GetAccumulatedProtocolFeesReturnType = bigint

export async function getAccumulatedProtocolFees(
  publicClient: PublicClient,
  parameters: GetAccumulatedProtocolFeesParameters,
): Promise<GetAccumulatedProtocolFeesReturnType> {
  const { operatorAddress, token } = parameters

  return wrapContractCall('getAccumulatedProtocolFees', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'accumulatedProtocolFees',
      args: [token],
    }),
  )
}
