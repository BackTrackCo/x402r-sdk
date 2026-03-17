import type { Address, PublicClient } from 'viem'
import { paymentIndexRecorderAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetReceiverPaymentParameters {
  recorderAddress: Address
  receiver: Address
  index: bigint
}

export async function getReceiverPayment(
  publicClient: PublicClient,
  parameters: GetReceiverPaymentParameters,
): Promise<PaymentInfo> {
  const { recorderAddress, receiver, index } = parameters

  const result = await wrapContractCall('getReceiverPayment', () =>
    publicClient.readContract({
      address: recorderAddress,
      abi: paymentIndexRecorderAbi,
      functionName: 'getReceiverPayment',
      args: [receiver, index],
    }),
  )

  return result as unknown as PaymentInfo
}
