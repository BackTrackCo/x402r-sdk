import { type Address, type PublicClient, zeroAddress } from 'viem'
import {
  iFeeCalculatorAbi,
  paymentOperatorAbi,
  protocolFeeConfigAbi,
} from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { FeeCalculationResult } from './types.js'

const BASIS_POINTS = 10_000n

export interface CalculateTotalFeesParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  caller: Address
}
export type CalculateTotalFeesReturnType = FeeCalculationResult

export async function calculateTotalFees(
  publicClient: PublicClient,
  parameters: CalculateTotalFeesParameters,
): Promise<CalculateTotalFeesReturnType> {
  const { operatorAddress, paymentInfo, amount, caller } = parameters

  return wrapContractCall('calculateTotalFees', async () => {
    const [feeCalculator, protocolFeeConfig] = await Promise.all([
      publicClient.readContract({
        address: operatorAddress,
        abi: paymentOperatorAbi,
        functionName: 'FEE_CALCULATOR',
      }),
      publicClient.readContract({
        address: operatorAddress,
        abi: paymentOperatorAbi,
        functionName: 'PROTOCOL_FEE_CONFIG',
      }),
    ])

    const [operatorFeeBps, protocolFeeBps] = await Promise.all([
      feeCalculator === zeroAddress
        ? 0n
        : publicClient.readContract({
            address: feeCalculator,
            abi: iFeeCalculatorAbi,
            functionName: 'calculateFee',
            args: [paymentInfo, amount, caller],
          }),
      protocolFeeConfig === zeroAddress
        ? 0n
        : publicClient.readContract({
            address: protocolFeeConfig,
            abi: protocolFeeConfigAbi,
            functionName: 'getProtocolFeeBps',
            args: [paymentInfo, amount, caller],
          }),
    ])

    const totalFeeBps = operatorFeeBps + protocolFeeBps
    const operatorFeeAmount = (amount * operatorFeeBps) / BASIS_POINTS
    const protocolFeeAmount = (amount * protocolFeeBps) / BASIS_POINTS
    const totalFeeAmount = operatorFeeAmount + protocolFeeAmount
    const netAmount = amount - totalFeeAmount

    return {
      protocolFeeBps,
      operatorFeeBps,
      totalFeeBps,
      protocolFeeAmount,
      operatorFeeAmount,
      totalFeeAmount,
      netAmount,
    }
  })
}
