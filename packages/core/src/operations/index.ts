export { wrapContractCall } from './error-wrapping.js'

// Evidence
export type { EvidenceEntry } from './evidence.js'
export {
  getEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  SubmitterRole,
  submitEvidence,
} from './evidence.js'

// Fees
export type { FeeAddresses, FeeCalculationResult } from './fees.js'
export {
  calculateOperatorFeeBps,
  calculateProtocolFeeBps,
  calculateTotalFees,
  distributeFees,
  formatFeeBreakdown,
  getFeeAddresses,
  validateFeeBounds,
} from './fees.js'

// Freeze
export { freezePayment, isFrozen, unfreezePayment } from './freeze.js'

// Operator reads
export type { ConditionSlot, OperatorSlots } from './operator.js'
export {
  getConditionAddress,
  getEscrowAddress,
  getOperatorConfig,
} from './operator.js'

// Operator writes
export { authorize, charge, release } from './operator-writes.js'

// Payment state
export type { PaymentAmounts } from './payment-state.js'
export { getPaymentAmounts, getPaymentState } from './payment-state.js'

// Refund
export type { RefundRequestData } from './refund.js'
export {
  approveRefundWithSignature,
  cancelRefundRequest,
  denyRefundRequest,
  getRefundRequest,
  getRefundRequestStatus,
  hasRefundRequest,
  RefundRequestStatus,
  refuseRefundRequest,
  requestRefund,
} from './refund.js'

// Refund budget
export {
  approveRefundBudget,
  getRefundBudget,
  refundInEscrow,
  refundPostEscrow,
} from './refund-budget.js'
