import type { Address, PublicClient } from 'viem'
import { paymentIndexRecorderHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetReceiverPaymentParameters {
  hookAddress: Address
  receiver: Address
  index: bigint
}

export async function getReceiverPayment(
  publicClient: PublicClient,
  parameters: GetReceiverPaymentParameters,
): Promise<PaymentInfo> {
  const { hookAddress, receiver, index } = parameters

  const result = await wrapContractCall('getReceiverPayment', () =>
    publicClient.readContract({
      address: hookAddress,
      abi: paymentIndexRecorderHookAbi,
      functionName: 'getReceiverPayment',
      args: [receiver, index],
    }),
  )

  return result as unknown as PaymentInfo
}
