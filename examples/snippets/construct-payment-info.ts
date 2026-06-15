import { getChainConfig, type PaymentInfo } from '@x402r/core'
import type { Address } from 'viem'

// Build a PaymentInfo — the canonical payment intent the escrow operates on.
// Token + escrow addresses come from the chain config so they stay in sync
// with the source-of-truth address table. abitype maps the struct's
// uint8–uint48 fields to `number` and uint56–uint256 to `bigint`.
const chainConfig = getChainConfig(84532) // Base Sepolia
const FAR_FUTURE = 281_474_976_710_655 // max uint48 — effectively never expires

export const paymentInfo: PaymentInfo = {
  operator: '0x0000000000000000000000000000000000000001' as Address,
  payer: '0x0000000000000000000000000000000000000002' as Address,
  receiver: '0x0000000000000000000000000000000000000003' as Address,
  token: chainConfig.usdc,
  maxAmount: 1_000_000n, // 1 USDC (6 decimals)
  preApprovalExpiry: FAR_FUTURE,
  authorizationExpiry: FAR_FUTURE,
  refundExpiry: FAR_FUTURE,
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: '0x0000000000000000000000000000000000000001' as Address,
  salt: 1n,
}
