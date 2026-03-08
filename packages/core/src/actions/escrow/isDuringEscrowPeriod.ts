import type { Address, PublicClient } from 'viem'
import { escrowPeriodAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface IsDuringEscrowPeriodParameters {
  escrowPeriodAddress: Address
  paymentInfo: PaymentInfo
}
export type IsDuringEscrowPeriodReturnType = boolean

export async function isDuringEscrowPeriod(
  publicClient: PublicClient,
  parameters: IsDuringEscrowPeriodParameters,
): Promise<IsDuringEscrowPeriodReturnType> {
  const { escrowPeriodAddress, paymentInfo } = parameters

  return wrapContractCall('isDuringEscrowPeriod', () =>
    publicClient.readContract({
      address: escrowPeriodAddress,
      abi: escrowPeriodAbi,
      functionName: 'isDuringEscrowPeriod',
      args: [paymentInfo],
    }),
  )
}
