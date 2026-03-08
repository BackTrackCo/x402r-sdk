import type { Address } from 'viem'

export interface FeeCalculationResult {
  protocolFeeBps: bigint
  operatorFeeBps: bigint
  totalFeeBps: bigint
  protocolFeeAmount: bigint
  operatorFeeAmount: bigint
  totalFeeAmount: bigint
  netAmount: bigint
}

export interface FeeAddresses {
  operatorFeeCalculator: Address
  protocolFeeConfig: Address
  protocolFeeCalculator: Address
  operatorFeeRecipient: Address
  protocolFeeRecipient: Address
}
