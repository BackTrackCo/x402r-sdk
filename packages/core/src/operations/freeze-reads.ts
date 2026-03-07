import type { Address, PublicClient } from 'viem'
import { freezeAbi } from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

export async function isFrozen(
  publicClient: PublicClient,
  freezeAddress: Address,
  paymentInfo: PaymentInfo,
): Promise<boolean> {
  return wrapContractCall('isFrozen', () =>
    publicClient.readContract({
      address: freezeAddress,
      abi: freezeAbi,
      functionName: 'isFrozen',
      args: [paymentInfo],
    }),
  )
}
