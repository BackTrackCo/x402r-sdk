/**
 * Shared operations used across client, merchant, and arbiter packages
 * @module shared
 */

export {
  hasRefundRequest,
  getRefundRequest,
  getRefundStatus,
  getRefundRequestByKey,
  getRefundRequestsByKeys,
  approveRefundRequest,
  denyRefundRequest,
  type RefundReadContext,
  type RefundWriteContext,
} from "./refund-operations.js";

export { isFrozen, watchFreezeEvents, type FreezeReadContext } from "./freeze-operations.js";

export {
  submitEvidence,
  getEvidence,
  getEvidenceCount,
  getEvidenceBatch,
  getAllEvidence,
  resolveEvidenceContent,
  watchEvidenceSubmissions,
  type EvidenceReadContext,
  type EvidenceWriteContext,
} from "./evidence-operations.js";

export {
  getPaymentState,
  getPaymentDetails,
  indexPaymentInfoFromEvents,
  type PaymentStateReadContext,
  type PaymentDetailsContext,
} from "./payment-state-operations.js";

export {
  getRefundBudget,
  approveRefundBudget,
  refundPostEscrow,
  refundPostEscrowFromBudget,
  type RefundBudgetReadContext,
  type RefundBudgetWriteContext,
  type OperatorWriteContext,
} from "./refund-budget-operations.js";

export {
  createRefundReadCtx,
  createRefundWriteCtx,
  createEvidenceReadCtx,
  createEvidenceWriteCtx,
  createRefundBudgetReadCtx,
  createRefundBudgetWriteCtx,
  createOperatorWriteCtx,
} from "./context-helpers.js";
