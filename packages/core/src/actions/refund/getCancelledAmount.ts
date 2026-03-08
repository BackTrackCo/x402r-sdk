import type { Address, PublicClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetCancelledAmountParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
  cancelIndex: bigint
}
export type GetCancelledAmountReturnType = bigint

export async function getCancelledAmount(
  publicClient: PublicClient,
  parameters: GetCancelledAmountParameters,
): Promise<GetCancelledAmountReturnType> {
  const { contractAddress, paymentInfo, nonce, cancelIndex } = parameters

  return wrapContractCall('getCancelledAmount', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getCancelledAmount',
      args: [paymentInfo, nonce, cancelIndex],
    }),
  )
}
