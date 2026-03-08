import type { Address } from 'viem'

export interface OperatorSlots {
  escrow: Address
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
  feeCalculator: Address
  feeRecipient: Address
  protocolFeeConfig: Address
}

export type ConditionSlot =
  | 'AUTHORIZE_CONDITION'
  | 'CHARGE_CONDITION'
  | 'RELEASE_CONDITION'
  | 'REFUND_IN_ESCROW_CONDITION'
  | 'REFUND_POST_ESCROW_CONDITION'
