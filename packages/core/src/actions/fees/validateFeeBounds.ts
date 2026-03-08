import type { PaymentInfo } from '../../types/index.js'
import type { FeeCalculationResult } from './types.js'

export function validateFeeBounds(
  fees: FeeCalculationResult,
  paymentInfo: PaymentInfo,
): boolean {
  return (
    fees.totalFeeBps >= BigInt(paymentInfo.minFeeBps) &&
    fees.totalFeeBps <= BigInt(paymentInfo.maxFeeBps)
  )
}
