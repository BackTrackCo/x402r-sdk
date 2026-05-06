import type { Address, PublicClient } from 'viem'
import { paymentIndexRecorderHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPayerPaymentsFromHookParameters {
  hookAddress: Address
  payer: Address
  offset: bigint
  count: bigint
}

export interface GetPayerPaymentsFromHookReturnType {
  payments: PaymentInfo[]
  total: bigint
}

export async function getPayerPaymentsFromHook(
  publicClient: PublicClient,
  parameters: GetPayerPaymentsFromHookParameters,
): Promise<GetPayerPaymentsFromHookReturnType> {
  const { hookAddress, payer, offset, count } = parameters

  const [payments, total] = await wrapContractCall(
    'getPayerPaymentsFromHook',
    () =>
      publicClient.readContract({
        address: hookAddress,
        abi: paymentIndexRecorderHookAbi,
        functionName: 'getPayerPayments',
        args: [payer, offset, count],
      }),
  )

  return { payments: payments as unknown as PaymentInfo[], total }
}
