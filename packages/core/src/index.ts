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
  type ComputeAndConditionAddressParameters,
  type ComputeAndConditionAddressReturnType,
  type ComputeEscrowPeriodAddressParameters,
  type ComputeEscrowPeriodAddressReturnType,
  type ComputeFeeCalculatorAddressParameters,
  type ComputeFeeCalculatorAddressReturnType,
  type ComputeFreezeAddressParameters,
  type ComputeFreezeAddressReturnType,
  type ComputeNotConditionAddressParameters,
  type ComputeNotConditionAddressReturnType,
  type ComputeOperatorAddressParameters,
  type ComputeOperatorAddressReturnType,
  type ComputeOrConditionAddressParameters,
  type ComputeOrConditionAddressReturnType,
  type ComputeRecorderCombinatorAddressParameters,
  type ComputeRecorderCombinatorAddressReturnType,
  type ComputeStaticAddressConditionAddressParameters,
  type ComputeStaticAddressConditionAddressReturnType,
  computeAndConditionAddress,
  computeEscrowPeriodAddress,
  computeFeeCalculatorAddress,
  computeFreezeAddress,
  computeNotConditionAddress,
  computeOperatorAddress,
  computeOrConditionAddress,
  computeRecorderCombinatorAddress,
  computeStaticAddressConditionAddress,
  type DeployAndConditionParameters,
  type DeployAndConditionReturnType,
  type DeployEscrowPeriodParameters,
  type DeployEscrowPeriodReturnType,
  type DeployFeeCalculatorParameters,
  type DeployFeeCalculatorReturnType,
  type DeployFreezeParameters,
  type DeployFreezeReturnType,
  type DeployNotConditionParameters,
  type DeployNotConditionReturnType,
  type DeployOperatorParameters,
  type DeployOperatorReturnType,
  type DeployOrConditionParameters,
  type DeployOrConditionReturnType,
  type DeployRecorderCombinatorParameters,
  type DeployRecorderCombinatorReturnType,
  type DeployStaticAddressConditionParameters,
  type DeployStaticAddressConditionReturnType,
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
  type ComputeEscrowNonceReturnType,
  type ComputePaymentInfoHashReturnType,
  computeEscrowNonce,
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
} from './payment/hashing.js'
export {
  type ToPaymentInfoReturnType,
  toPaymentInfo,
} from './payment/serialization.js'
export { validatePaymentInfo } from './payment/validation.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  ConditionConfig,
  OperatorConfig,
  PaymentInfo,
} from './types/index.js'
