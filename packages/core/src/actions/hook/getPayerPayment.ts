import type { Address, PublicClient } from 'viem'
import { paymentIndexHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPayerPaymentParameters {
  hookAddress: Address
  payer: Address
  index: bigint
}

export async function getPayerPayment(
  publicClient: PublicClient,
  parameters: GetPayerPaymentParameters,
): Promise<PaymentInfo> {
  const { hookAddress, payer, index } = parameters

  const result = await wrapContractCall('getPayerPayment', () =>
    publicClient.readContract({
      address: hookAddress,
      abi: paymentIndexHookAbi,
      functionName: 'getPayerPayment',
      args: [payer, index],
    }),
  )

  return result as unknown as PaymentInfo
}
