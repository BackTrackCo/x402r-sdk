/**
 * Shared operations used across client, merchant, and arbiter packages
 * @module shared
 */

export {
  hasRefundRequest,
  getRefundRequest,
  getRefundStatus,
  getRefundRequestByKey,
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
  watchEvidenceSubmissions,
  type EvidenceReadContext,
  type EvidenceWriteContext,
} from "./evidence-operations.js";
