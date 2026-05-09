import type { Address } from 'viem'

export interface OperatorSlots {
  escrow: Address
  authorizeCondition: Address
  authorizeHook: Address
  chargeCondition: Address
  chargeHook: Address
  captureCondition: Address
  captureHook: Address
  voidCondition: Address
  voidHook: Address
  refundCondition: Address
  refundHook: Address
  feeCalculator: Address
  feeReceiver: Address
  protocolFeeConfig: Address
}

export type ConditionSlot =
  | 'AUTHORIZE_PRE_ACTION_CONDITION'
  | 'CHARGE_PRE_ACTION_CONDITION'
  | 'CAPTURE_PRE_ACTION_CONDITION'
  | 'VOID_PRE_ACTION_CONDITION'
  | 'REFUND_PRE_ACTION_CONDITION'
