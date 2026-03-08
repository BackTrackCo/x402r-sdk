import { formatUnits } from 'viem'
import type { FeeCalculationResult } from './types.js'

export interface FormatFeeBreakdownParameters {
  fees: FeeCalculationResult
  decimals?: number
  symbol?: string
}
export type FormatFeeBreakdownReturnType = string

export function formatFeeBreakdown(
  parameters: FormatFeeBreakdownParameters,
): FormatFeeBreakdownReturnType {
  const { fees, decimals = 6, symbol = 'USDC' } = parameters

  const fmt = (bps: bigint, amount: bigint) =>
    `${bps} bps (${Number(bps) / 100}%) (${formatUnits(amount, decimals)} ${symbol})`

  return [
    `Operator: ${fmt(fees.operatorFeeBps, fees.operatorFeeAmount)}`,
    `Protocol: ${fmt(fees.protocolFeeBps, fees.protocolFeeAmount)}`,
    `Total: ${fmt(fees.totalFeeBps, fees.totalFeeAmount)}`,
  ].join(' | ')
}
