import { formatUnits } from 'viem'
import type { FeeCalculationResult } from './types.js'

export function formatFeeBreakdown(
  fees: FeeCalculationResult,
  decimals = 6,
  symbol = 'USDC',
): string {
  const fmt = (bps: bigint, amount: bigint) =>
    `${bps} bps (${Number(bps) / 100}%) (${formatUnits(amount, decimals)} ${symbol})`

  return [
    `Operator: ${fmt(fees.operatorFeeBps, fees.operatorFeeAmount)}`,
    `Protocol: ${fmt(fees.protocolFeeBps, fees.protocolFeeAmount)}`,
    `Total: ${fmt(fees.totalFeeBps, fees.totalFeeAmount)}`,
  ].join(' | ')
}
