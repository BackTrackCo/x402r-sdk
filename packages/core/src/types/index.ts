import type { Address } from 'viem'

// ---------------------------------------------------------------------------
// Payment State (SDK-level lifecycle enum)
// ---------------------------------------------------------------------------
// Derived from escrow PaymentState struct + contract events:
//   NonExistent → authorize() → InEscrow → release() → Released → (refundExpiry passed) → Settled
//                                  ↓                        ↓
//                          (authExpiry) → Expired    refundInEscrow/refundPostEscrow
//
// Not a Solidity enum — computed from escrow struct values and timestamps.

export const PaymentState = {
  NonExistent: 0,
  InEscrow: 1,
  Released: 2,
  Settled: 3,
  Expired: 4,
} as const

export type PaymentState = (typeof PaymentState)[keyof typeof PaymentState]

// ---------------------------------------------------------------------------
// Request Status (matches Solidity enum in requests/types/Types.sol)
// ---------------------------------------------------------------------------

export const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Denied: 2,
  Cancelled: 3,
} as const

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus]

// ---------------------------------------------------------------------------
// PaymentInfo (matches AuthCaptureEscrow.PaymentInfo struct)
// ---------------------------------------------------------------------------

export interface PaymentInfo {
  operator: Address
  payer: Address
  receiver: Address
  token: Address
  maxAmount: bigint
  preApprovalExpiry: bigint
  authorizationExpiry: bigint
  refundExpiry: bigint
  minFeeBps: number
  maxFeeBps: number
  feeReceiver: Address
  salt: bigint
}

// ---------------------------------------------------------------------------
// Operator Config (matches PaymentOperatorFactory.OperatorConfig + constructor)
// ---------------------------------------------------------------------------

export interface OperatorConfig {
  escrow: Address
  protocolFeeConfig: Address
  feeRecipient: Address
  feeCalculator: Address
  authorizeCondition: Address
  authorizeRecorder: Address
  chargeCondition: Address
  chargeRecorder: Address
  releaseCondition: Address
  releaseRecorder: Address
  refundInEscrowCondition: Address
  refundInEscrowRecorder: Address
  refundPostEscrowCondition: Address
  refundPostEscrowRecorder: Address
}

// ---------------------------------------------------------------------------
// Fee Structure (fee-related subset of operator config)
// ---------------------------------------------------------------------------

export interface FeeStructure {
  feeCalculator: Address
  protocolFeeConfig: Address
  feeRecipient: Address
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max value for uint32 — used for authorization expiry bounds */
export const MAX_UINT32 = 2n ** 32n - 1n

/** Max value for uint48 — used for refund expiry timestamps */
export const MAX_UINT48 = 2n ** 48n - 1n

/** Basis points denominator (100% = 10,000 bps) */
export const BASIS_POINTS = 10_000
