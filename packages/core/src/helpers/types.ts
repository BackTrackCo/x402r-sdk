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
  name?: string
  version?: string
}

export interface RefundableOverrides {
  escrowAddress?: Address
  tokenCollector?: Address
  minFeeBps?: number
  maxFeeBps?: number
  feeReceiver?: Address
  extra?: Record<string, unknown>
}
