import type { Address, PublicClient } from 'viem'
import { escrowPeriodAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetEscrowPeriodDurationParameters {
  escrowPeriodAddress: Address
}
export type GetEscrowPeriodDurationReturnType = bigint

export async function getEscrowPeriodDuration(
  publicClient: PublicClient,
  parameters: GetEscrowPeriodDurationParameters,
): Promise<GetEscrowPeriodDurationReturnType> {
  const { escrowPeriodAddress } = parameters

  return wrapContractCall('getEscrowPeriodDuration', () =>
    publicClient.readContract({
      address: escrowPeriodAddress,
      abi: escrowPeriodAbi,
      functionName: 'ESCROW_PERIOD',
    }),
  )
}
