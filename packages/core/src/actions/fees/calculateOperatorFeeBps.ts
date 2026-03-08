import { type Address, type PublicClient, zeroAddress } from 'viem'
import { iFeeCalculatorAbi, paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface CalculateOperatorFeeBpsParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  caller: Address
}
export type CalculateOperatorFeeBpsReturnType = bigint

export async function calculateOperatorFeeBps(
  publicClient: PublicClient,
  parameters: CalculateOperatorFeeBpsParameters,
): Promise<CalculateOperatorFeeBpsReturnType> {
  const { operatorAddress, paymentInfo, amount, caller } = parameters

  return wrapContractCall('calculateOperatorFeeBps', async () => {
    const feeCalculator = await publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'FEE_CALCULATOR',
    })

    if (feeCalculator === zeroAddress) return 0n

    return publicClient.readContract({
      address: feeCalculator,
      abi: iFeeCalculatorAbi,
      functionName: 'calculateFee',
      args: [paymentInfo, amount, caller],
    })
  })
}
