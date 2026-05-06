import type { Address, Hex, PublicClient } from 'viem'
import { zeroAddress } from 'viem'
import { paymentIndexHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetHookPaymentInfoParameters {
  hookAddress: Address
  hash: Hex
}

export async function getHookPaymentInfo(
  publicClient: PublicClient,
  parameters: GetHookPaymentInfoParameters,
): Promise<PaymentInfo | null> {
  const { hookAddress, hash } = parameters

  const result = await wrapContractCall('getHookPaymentInfo', () =>
    publicClient.readContract({
      address: hookAddress,
      abi: paymentIndexHookAbi,
      functionName: 'getPaymentInfo',
      args: [hash],
    }),
  )

  const info = result as unknown as PaymentInfo
  // If operator is zero address, the payment was not found
  if (info.operator === zeroAddress) {
    return null
  }
  return info
}
