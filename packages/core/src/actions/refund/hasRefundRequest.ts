import type { Address, PublicClient } from 'viem'
import { signatureRefundRequestAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface HasRefundRequestParameters {
  contractAddress: Address
  paymentInfo: PaymentInfo
  nonce: bigint
}
export type HasRefundRequestReturnType = boolean

export async function hasRefundRequest(
  publicClient: PublicClient,
  parameters: HasRefundRequestParameters,
): Promise<HasRefundRequestReturnType> {
  const { contractAddress, paymentInfo, nonce } = parameters

  return wrapContractCall('hasRefundRequest', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'hasRefundRequest',
      args: [paymentInfo, nonce],
    }),
  )
}
