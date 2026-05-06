import type { Address, PublicClient } from 'viem'
import { paymentIndexHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetReceiverPaymentsFromRecorderParameters {
  recorderAddress: Address
  receiver: Address
  offset: bigint
  count: bigint
}

export interface GetReceiverPaymentsFromRecorderReturnType {
  payments: PaymentInfo[]
  total: bigint
}

export async function getReceiverPaymentsFromRecorder(
  publicClient: PublicClient,
  parameters: GetReceiverPaymentsFromRecorderParameters,
): Promise<GetReceiverPaymentsFromRecorderReturnType> {
  const { recorderAddress, receiver, offset, count } = parameters

  const [payments, total] = await wrapContractCall(
    'getReceiverPaymentsFromRecorder',
    () =>
      publicClient.readContract({
        address: recorderAddress,
        abi: paymentIndexHookAbi,
        functionName: 'getReceiverPayments',
        args: [receiver, offset, count],
      }),
  )

  return { payments: payments as unknown as PaymentInfo[], total }
}
