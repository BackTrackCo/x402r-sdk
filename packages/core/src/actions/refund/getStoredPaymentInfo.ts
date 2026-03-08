import type { Address, Hex, PublicClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetStoredPaymentInfoParameters {
  contractAddress: Address
  paymentInfoHash: Hex
}
export type GetStoredPaymentInfoReturnType = PaymentInfo

export async function getStoredPaymentInfo(
  publicClient: PublicClient,
  parameters: GetStoredPaymentInfoParameters,
): Promise<GetStoredPaymentInfoReturnType> {
  const { contractAddress, paymentInfoHash } = parameters

  return wrapContractCall('getStoredPaymentInfo', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getPaymentInfo',
      args: [paymentInfoHash],
    }),
  )
}
