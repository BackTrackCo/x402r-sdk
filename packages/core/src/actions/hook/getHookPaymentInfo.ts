import type { Address, Hex, PublicClient } from 'viem'
import { zeroAddress } from 'viem'
import { paymentIndexRecorderHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetHookPaymentInfoParameters {
  hookAddress: Address
  hash: Hex
  /**
   * If set, returns null when the on-chain record's `operator` doesn't match.
   * The canonical `PaymentIndexRecorderHook` is a chain singleton — it
   * aggregates records across every operator routing through HookCombinator.
   * Multi-operator deployments should set this to scope reads.
   */
  operatorAddress?: Address
}

export async function getHookPaymentInfo(
  publicClient: PublicClient,
  parameters: GetHookPaymentInfoParameters,
): Promise<PaymentInfo | null> {
  const { hookAddress, hash, operatorAddress } = parameters

  const result = await wrapContractCall('getHookPaymentInfo', () =>
    publicClient.readContract({
      address: hookAddress,
      abi: paymentIndexRecorderHookAbi,
      functionName: 'getPaymentInfo',
      args: [hash],
    }),
  )

  const info = result as unknown as PaymentInfo
  // If operator is zero address, the payment was not found
  if (info.operator === zeroAddress) {
    return null
  }
  if (operatorAddress && info.operator !== operatorAddress) {
    return null
  }
  return info
}
