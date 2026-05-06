import type { Address, PublicClient } from 'viem'
import { paymentIndexHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPayerPaymentsFromRecorderParameters {
  recorderAddress: Address
  payer: Address
  offset: bigint
  count: bigint
}

export interface GetPayerPaymentsFromRecorderReturnType {
  payments: PaymentInfo[]
  total: bigint
}

export async function getPayerPaymentsFromRecorder(
  publicClient: PublicClient,
  parameters: GetPayerPaymentsFromRecorderParameters,
): Promise<GetPayerPaymentsFromRecorderReturnType> {
  const { recorderAddress, payer, offset, count } = parameters

  const [payments, total] = await wrapContractCall(
    'getPayerPaymentsFromRecorder',
    () =>
      publicClient.readContract({
        address: recorderAddress,
        abi: paymentIndexHookAbi,
        functionName: 'getPayerPayments',
        args: [payer, offset, count],
      }),
  )

  return { payments: payments as unknown as PaymentInfo[], total }
}
