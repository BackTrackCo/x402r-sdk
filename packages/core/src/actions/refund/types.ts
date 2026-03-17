import type { Hex } from 'viem'

export const RefundRequestStatus = {
  Pending: 0,
  Approved: 1,
  Denied: 2,
  Cancelled: 3,
  Refused: 4,
} as const

export type RefundRequestStatus =
  (typeof RefundRequestStatus)[keyof typeof RefundRequestStatus]

export interface RefundRequestData {
  paymentInfoHash: Hex
  nonce: bigint
  amount: bigint
  approvedAmount: bigint
  status: RefundRequestStatus
}
