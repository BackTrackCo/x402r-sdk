import type { Address, PublicClient } from 'viem'
import { paymentIndexRecorderAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPayerPaymentParameters {
  recorderAddress: Address
  payer: Address
  index: bigint
}

export async function getPayerPayment(
  publicClient: PublicClient,
  parameters: GetPayerPaymentParameters,
): Promise<PaymentInfo> {
  const { recorderAddress, payer, index } = parameters

  const result = await wrapContractCall('getPayerPayment', () =>
    publicClient.readContract({
      address: recorderAddress,
      abi: paymentIndexRecorderAbi,
      functionName: 'getPayerPayment',
      args: [payer, index],
    }),
  )

  return result as unknown as PaymentInfo
}
