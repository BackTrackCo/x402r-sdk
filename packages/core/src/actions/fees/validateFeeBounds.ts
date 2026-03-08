import type { PaymentInfo } from '../../types/index.js'
import type { FeeCalculationResult } from './types.js'

export interface ValidateFeeBoundsParameters {
  fees: FeeCalculationResult
  paymentInfo: PaymentInfo
}
export type ValidateFeeBoundsReturnType = boolean

export function validateFeeBounds(
  parameters: ValidateFeeBoundsParameters,
): ValidateFeeBoundsReturnType {
  const { fees, paymentInfo } = parameters
  return (
    fees.totalFeeBps >= BigInt(paymentInfo.minFeeBps) &&
    fees.totalFeeBps <= BigInt(paymentInfo.maxFeeBps)
  )
}
