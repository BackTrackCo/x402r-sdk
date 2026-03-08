import type { Address, PublicClient } from 'viem'
import { freezeAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface IsFrozenParameters {
  freezeAddress: Address
  paymentInfo: PaymentInfo
}
export type IsFrozenReturnType = boolean

export async function isFrozen(
  publicClient: PublicClient,
  parameters: IsFrozenParameters,
): Promise<IsFrozenReturnType> {
  const { freezeAddress, paymentInfo } = parameters

  return wrapContractCall('isFrozen', () =>
    publicClient.readContract({
      address: freezeAddress,
      abi: freezeAbi,
      functionName: 'isFrozen',
      args: [paymentInfo],
    }),
  )
}
