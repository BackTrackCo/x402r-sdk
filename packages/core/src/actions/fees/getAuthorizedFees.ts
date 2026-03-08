import type { Address, Hex, PublicClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetAuthorizedFeesParameters {
  operatorAddress: Address
  paymentInfoHash: Hex
}
export interface GetAuthorizedFeesReturnType {
  totalFeeBps: number
  protocolFeeBps: number
}

export async function getAuthorizedFees(
  publicClient: PublicClient,
  parameters: GetAuthorizedFeesParameters,
): Promise<GetAuthorizedFeesReturnType> {
  const { operatorAddress, paymentInfoHash } = parameters

  return wrapContractCall('getAuthorizedFees', async () => {
    const [totalFeeBps, protocolFeeBps] = await publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'authorizedFees',
      args: [paymentInfoHash],
    })
    return { totalFeeBps, protocolFeeBps }
  })
}
