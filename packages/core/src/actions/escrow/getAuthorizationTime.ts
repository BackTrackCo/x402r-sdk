import type { Address, PublicClient } from 'viem'
import { escrowPeriodAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetAuthorizationTimeParameters {
  escrowPeriodAddress: Address
  paymentInfo: PaymentInfo
}
export type GetAuthorizationTimeReturnType = bigint

export async function getAuthorizationTime(
  publicClient: PublicClient,
  parameters: GetAuthorizationTimeParameters,
): Promise<GetAuthorizationTimeReturnType> {
  const { escrowPeriodAddress, paymentInfo } = parameters

  return wrapContractCall('getAuthorizationTime', () =>
    publicClient.readContract({
      address: escrowPeriodAddress,
      abi: escrowPeriodAbi,
      functionName: 'getAuthorizationTime',
      args: [paymentInfo],
    }),
  )
}
