import type { Address } from 'viem'

export interface EscrowExtra {
  escrowAddress: Address
  operatorAddress: Address
  tokenCollector: Address
  authorizeAddress?: Address
  minDeposit?: string
  maxDeposit?: string
  preApprovalExpirySeconds?: number
  authorizationExpirySeconds?: number
  refundExpirySeconds?: number
  minFeeBps?: number
  maxFeeBps?: number
  feeReceiver?: Address
  name: string
  version: string
}

export interface PaymentOption {
  network: string
  token: Address
  extra: EscrowExtra & Record<string, unknown>
  [key: string]: unknown
}

export interface RefundableOptions {
  operatorAddress: Address
  network: string
  token: Address
  minFeeBps?: number
  maxFeeBps?: number
  feeReceiver?: Address
  name?: string
  version?: string
  extra?: Record<string, unknown>
}
