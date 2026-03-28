import type { Address, PublicClient } from 'viem'
import { refundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetCancelledAmountParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  cancelIndex: bigint
}
export type GetCancelledAmountReturnType = bigint

export async function getCancelledAmount(
  publicClient: PublicClient,
  parameters: GetCancelledAmountParameters,
): Promise<GetCancelledAmountReturnType> {
  const { contractAddress, paymentInfo, cancelIndex } = parameters

  return wrapContractCall('getCancelledAmount', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: refundRequestAbi,
      functionName: 'getCancelledAmount',
      args: [paymentInfo, cancelIndex],
    }),
  )
}
