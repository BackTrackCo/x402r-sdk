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
  | 'AUTHORIZE_PRE_ACTION_CONDITION'
  | 'CHARGE_PRE_ACTION_CONDITION'
  | 'CAPTURE_PRE_ACTION_CONDITION'
  | 'VOID_PRE_ACTION_CONDITION'
  | 'REFUND_PRE_ACTION_CONDITION'
