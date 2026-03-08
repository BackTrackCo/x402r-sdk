export interface PaymentAmounts {
  hasCollectedPayment: boolean
  capturableAmount: bigint
  refundableAmount: bigint
}
