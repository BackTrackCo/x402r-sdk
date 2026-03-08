import type { Address } from 'viem'

export const SubmitterRole = {
  Payer: 0,
  Receiver: 1,
  Arbiter: 2,
} as const

export type SubmitterRole = (typeof SubmitterRole)[keyof typeof SubmitterRole]

export interface EvidenceEntry {
  submitter: Address
  role: SubmitterRole
  timestamp: number
  cid: string
}
