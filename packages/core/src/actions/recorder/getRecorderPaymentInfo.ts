import type { Address, Hex, PublicClient } from 'viem'
import { paymentIndexRecorderAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetRecorderPaymentInfoParameters {
  recorderAddress: Address
  hash: Hex
}

export async function getRecorderPaymentInfo(
  publicClient: PublicClient,
  parameters: GetRecorderPaymentInfoParameters,
): Promise<PaymentInfo | null> {
  const { recorderAddress, hash } = parameters

  const result = await wrapContractCall('getRecorderPaymentInfo', () =>
    publicClient.readContract({
      address: recorderAddress,
      abi: paymentIndexRecorderAbi,
      functionName: 'getPaymentInfo',
      args: [hash],
    }),
  )

  const info = result as unknown as PaymentInfo
  // If operator is zero address, the payment was not found
  if (info.operator === '0x0000000000000000000000000000000000000000') {
    return null
  }
  return info
}
