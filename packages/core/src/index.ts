// ---------------------------------------------------------------------------
// ABIs (auto-generated — keep export *)
// ---------------------------------------------------------------------------
export * from './abis/generated.js'
// ---------------------------------------------------------------------------
// Actions — Escrow
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Actions — Evidence
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Actions — Fees
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Actions — Freeze
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Actions — Operator
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Actions — Refund
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Actions — Refund Budget
// ---------------------------------------------------------------------------
export type {
  ApproveRefundBudgetParameters,
  ApproveRefundBudgetReturnType,
  ApproveRefundWithSignatureParameters,
  ApproveRefundWithSignatureReturnType,
  AuthorizeParameters,
  AuthorizeReturnType,
  CalculateOperatorFeeBpsParameters,
  CalculateOperatorFeeBpsReturnType,
  CalculateProtocolFeeBpsParameters,
  CalculateProtocolFeeBpsReturnType,
  CalculateTotalFeesParameters,
  CalculateTotalFeesReturnType,
  CancelRefundRequestParameters,
  CancelRefundRequestReturnType,
  ChargeParameters,
  ChargeReturnType,
  ConditionSlot,
  DenyRefundRequestParameters,
  DenyRefundRequestReturnType,
  DistributeFeesParameters,
  DistributeFeesReturnType,
  EvidenceEntry,
  FeeAddresses,
  FeeCalculationResult,
  FreezePaymentParameters,
  FreezePaymentReturnType,
  GetAccumulatedProtocolFeesParameters,
  GetAccumulatedProtocolFeesReturnType,
  GetAuthorizationTimeParameters,
  GetAuthorizationTimeReturnType,
  GetAuthorizedFeesParameters,
  GetAuthorizedFeesReturnType,
  GetCancelCountParameters,
  GetCancelCountReturnType,
  GetCancelledAmountParameters,
  GetCancelledAmountReturnType,
  GetConditionAddressParameters,
  GetConditionAddressReturnType,
  GetEscrowAddressParameters,
  GetEscrowAddressReturnType,
  GetEscrowPeriodDurationParameters,
  GetEscrowPeriodDurationReturnType,
  GetEvidenceBatchParameters,
  GetEvidenceBatchReturnType,
  GetEvidenceCountParameters,
  GetEvidenceCountReturnType,
  GetEvidenceParameters,
  GetEvidenceReturnType,
  GetFeeAddressesParameters,
  GetFeeAddressesReturnType,
  GetOperatorConfigParameters,
  GetOperatorConfigReturnType,
  GetOperatorRefundRequestsParameters,
  GetOperatorRefundRequestsReturnType,
  GetPayerRefundRequestsParameters,
  GetPayerRefundRequestsReturnType,
  GetPaymentAmountsParameters,
  GetPaymentAmountsReturnType,
  GetPaymentStateParameters,
  GetPaymentStateReturnType,
  GetReceiverRefundRequestsParameters,
  GetReceiverRefundRequestsReturnType,
  GetRefundBudgetParameters,
  GetRefundBudgetReturnType,
  GetRefundRequestByKeyParameters,
  GetRefundRequestByKeyReturnType,
  GetRefundRequestParameters,
  GetRefundRequestReturnType,
  GetRefundRequestStatusParameters,
  GetRefundRequestStatusReturnType,
  GetStoredPaymentInfoParameters,
  GetStoredPaymentInfoReturnType,
  HasRefundRequestParameters,
  HasRefundRequestReturnType,
  IsDuringEscrowPeriodParameters,
  IsDuringEscrowPeriodReturnType,
  IsFrozenParameters,
  IsFrozenReturnType,
  OperatorSlots,
  PaymentAmounts,
  RefundInEscrowParameters,
  RefundInEscrowReturnType,
  RefundPostEscrowParameters,
  RefundPostEscrowReturnType,
  RefundRequestData,
  RefuseRefundRequestParameters,
  RefuseRefundRequestReturnType,
  ReleaseParameters,
  ReleaseReturnType,
  RequestRefundParameters,
  RequestRefundReturnType,
  SubmitEvidenceParameters,
  SubmitEvidenceReturnType,
  UnfreezePaymentParameters,
  UnfreezePaymentReturnType,
} from './actions/index.js'
export {
  approveRefundBudget,
  approveRefundWithSignature,
  authorize,
  calculateOperatorFeeBps,
  calculateProtocolFeeBps,
  calculateTotalFees,
  cancelRefundRequest,
  charge,
  denyRefundRequest,
  distributeFees,
  formatFeeBreakdown,
  freezePayment,
  getAccumulatedProtocolFees,
  getAuthorizationTime,
  getAuthorizedFees,
  getCancelCount,
  getCancelledAmount,
  getConditionAddress,
  getEscrowAddress,
  getEscrowPeriodDuration,
  getEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  getFeeAddresses,
  getOperatorConfig,
  getOperatorRefundRequests,
  getPayerRefundRequests,
  getPaymentAmounts,
  getPaymentState,
  getReceiverRefundRequests,
  getRefundBudget,
  getRefundRequest,
  getRefundRequestByKey,
  getRefundRequestStatus,
  getStoredPaymentInfo,
  hasRefundRequest,
  isDuringEscrowPeriod,
  isFrozen,
  RefundRequestStatus,
  refundInEscrow,
  refundPostEscrow,
  refuseRefundRequest,
  release,
  requestRefund,
  SubmitterRole,
  submitEvidence,
  unfreezePayment,
  validateFeeBounds,
} from './actions/index.js'
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
