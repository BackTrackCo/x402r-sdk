// ---------------------------------------------------------------------------
// ABIs (auto-generated — keep export *)
// ---------------------------------------------------------------------------
export * from './abis/generated.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export type {
  ConditionSingletonAddresses,
  FactoryAddresses,
  SupportedChainId,
  X402rChainConfig,
} from './config/index.js'
export {
  fromNetworkId,
  getChainConfig,
  getConditionSingletons,
  getFactoryAddress,
  getFactoryAddresses,
  hasConditionSingletons,
  hasFactories,
  isSupportedChain,
  supportedChainIds,
  toNetworkId,
  x402rChains,
} from './config/index.js'

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------
export {
  type AndConditionInput,
  type ConditionInput,
  type ConditionResolution,
  createConditionHelpers,
  type NotConditionInput,
  type OrConditionInput,
  previewConditionAddress,
  resolveCondition,
  type StaticAddressConditionInput,
} from './deploy/conditions.js'
export {
  computeAndConditionAddress,
  computeEscrowPeriodAddress,
  computeFeeCalculatorAddress,
  computeFreezeAddress,
  computeNotConditionAddress,
  computeOperatorAddress,
  computeOrConditionAddress,
  computeRecorderCombinatorAddress,
  computeStaticAddressConditionAddress,
  deployAndCondition,
  deployEscrowPeriod,
  deployFeeCalculator,
  deployFreeze,
  deployNotCondition,
  deployOperator,
  deployOrCondition,
  deployRecorderCombinator,
  deployStaticAddressCondition,
} from './deploy/factories.js'
export {
  computeViaFactory,
  type DeployResult,
  deployViaFactory,
  type FactoryFunctionNames,
} from './deploy/factory-helpers.js'
export {
  deployMarketplaceOperator,
  type MarketplaceOperatorDeployment,
  type MarketplaceOperatorOptions,
  type MarketplaceOperatorPreview,
  previewMarketplaceOperator,
} from './deploy/presets.js'

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export type { X402rErrorArgs } from './errors/index.js'
export {
  ConfigError,
  ContractCallError,
  NotImplementedError,
  ValidationError,
  X402rError,
} from './errors/index.js'

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export {
  requireAccount,
  wrapContractCall,
} from './operations/error-wrapping.js'
export type { EvidenceEntry } from './operations/evidence-reads.js'
export {
  getEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  SubmitterRole,
} from './operations/evidence-reads.js'
export { submitEvidence } from './operations/evidence-writes.js'
export type {
  FeeAddresses,
  FeeCalculationResult,
} from './operations/fee-reads.js'
export {
  calculateOperatorFeeBps,
  calculateProtocolFeeBps,
  calculateTotalFees,
  formatFeeBreakdown,
  getFeeAddresses,
  validateFeeBounds,
} from './operations/fee-reads.js'
export { distributeFees } from './operations/fee-writes.js'
export { isFrozen } from './operations/freeze-reads.js'
export { freezePayment, unfreezePayment } from './operations/freeze-writes.js'
export type { ConditionSlot, OperatorSlots } from './operations/operator.js'
export {
  getConditionAddress,
  getEscrowAddress,
  getOperatorConfig,
} from './operations/operator.js'
export { authorize, charge, release } from './operations/operator-writes.js'
export type { PaymentAmounts } from './operations/payment-state.js'
export {
  getPaymentAmounts,
  getPaymentState,
} from './operations/payment-state.js'
export { getRefundBudget } from './operations/refund-budget-reads.js'
export {
  approveRefundBudget,
  refundInEscrow,
  refundPostEscrow,
} from './operations/refund-budget-writes.js'
export type { RefundRequestData } from './operations/refund-reads.js'
export {
  getCancelCount,
  getCancelledAmount,
  getOperatorRefundRequests,
  getPayerRefundRequests,
  getReceiverRefundRequests,
  getRefundRequest,
  getRefundRequestByKey,
  getRefundRequestStatus,
  getStoredPaymentInfo,
  hasRefundRequest,
  RefundRequestStatus,
} from './operations/refund-reads.js'
export {
  approveRefundWithSignature,
  cancelRefundRequest,
  denyRefundRequest,
  refuseRefundRequest,
  requestRefund,
} from './operations/refund-writes.js'

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
export {
  computeEscrowNonce,
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
} from './payment/hashing.js'
export { toPaymentInfo } from './payment/serialization.js'
export { validatePaymentInfo } from './payment/validation.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  ConditionConfig,
  OperatorConfig,
  PaymentInfo,
} from './types/index.js'
