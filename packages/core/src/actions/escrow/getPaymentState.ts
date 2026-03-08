import type { Address, PublicClient } from 'viem'
import {
  authCaptureEscrowAbi,
  paymentOperatorAbi,
} from '../../abis/generated.js'
import { computePaymentInfoHash } from '../../payment/hashing.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPaymentStateParameters {
  operatorAddress: Address
  chainId: number
  paymentInfo: PaymentInfo
}
export type GetPaymentStateReturnType = readonly [boolean, bigint, bigint]

export async function getPaymentState(
  publicClient: PublicClient,
  parameters: GetPaymentStateParameters,
): Promise<GetPaymentStateReturnType> {
  const { operatorAddress, chainId, paymentInfo } = parameters

  const escrowAddress = await wrapContractCall('getPaymentState.ESCROW', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'ESCROW',
    }),
  )

  const hash = computePaymentInfoHash(chainId, escrowAddress, paymentInfo)

  return wrapContractCall('getPaymentState.paymentState', () =>
    publicClient.readContract({
      address: escrowAddress,
      abi: authCaptureEscrowAbi,
      functionName: 'paymentState',
      args: [hash],
    }),
  )
}
