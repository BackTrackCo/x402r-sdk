import type { Address, PublicClient } from 'viem'
import { paymentIndexRecorderHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetReceiverPaymentsFromHookParameters {
  hookAddress: Address
  receiver: Address
  offset: bigint
  count: bigint
}

export interface GetReceiverPaymentsFromHookReturnType {
  payments: PaymentInfo[]
  total: bigint
}

export async function getReceiverPaymentsFromHook(
  publicClient: PublicClient,
  parameters: GetReceiverPaymentsFromHookParameters,
): Promise<GetReceiverPaymentsFromHookReturnType> {
  const { hookAddress, receiver, offset, count } = parameters

  const [payments, total] = await wrapContractCall(
    'getReceiverPaymentsFromHook',
    () =>
      publicClient.readContract({
        address: hookAddress,
        abi: paymentIndexRecorderHookAbi,
        functionName: 'getReceiverPayments',
        args: [receiver, offset, count],
      }),
  )

  return { payments: payments as unknown as PaymentInfo[], total }
}
