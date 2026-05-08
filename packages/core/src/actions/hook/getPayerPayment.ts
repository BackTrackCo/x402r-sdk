import type { Address, PublicClient } from 'viem'
import { getAddress } from 'viem'
import { paymentIndexRecorderHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPayerPaymentParameters {
  hookAddress: Address
  payer: Address
  index: bigint
  /**
   * If set, returns null when the indexed record's `operator` doesn't match.
   * The canonical `PaymentIndexRecorderHook` is a chain singleton — `index`
   * positions reflect the aggregated cross-operator order, so the same
   * `index` may resolve to different operators across calls. Multi-operator
   * deployments should set this to scope reads (and prefer
   * `getPayerPaymentsFromHook` with `operatorAddress` for paginated lookups).
   */
  operatorAddress?: Address
}

export async function getPayerPayment(
  publicClient: PublicClient,
  parameters: GetPayerPaymentParameters,
): Promise<PaymentInfo | null> {
  const { hookAddress, payer, index, operatorAddress } = parameters

  const result = await wrapContractCall('getPayerPayment', () =>
    publicClient.readContract({
      address: hookAddress,
      abi: paymentIndexRecorderHookAbi,
      functionName: 'getPayerPayment',
      args: [payer, index],
    }),
  )

  const info = result as unknown as PaymentInfo
  // Normalize to checksummed form before compare (caller may pass lowercased).
  if (
    operatorAddress &&
    getAddress(info.operator) !== getAddress(operatorAddress)
  ) {
    return null
  }
  return info
}
