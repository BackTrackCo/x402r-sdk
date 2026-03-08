// ---------------------------------------------------------------------------
// SDK — factory + client
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Core re-exports — types
// ---------------------------------------------------------------------------
export type {
  ConditionConfig,
  ConditionSingletonAddresses,
  ConditionSlot,
  EvidenceEntry,
  FactoryAddresses,
  FeeAddresses,
  FeeCalculationResult,
  GetAuthorizedFeesReturnType,
  GetEvidenceBatchReturnType,
  GetOperatorRefundRequestsReturnType,
  GetPayerRefundRequestsReturnType,
  GetReceiverRefundRequestsReturnType,
  OperatorConfig,
  OperatorSlots,
  PaymentAmounts,
  PaymentInfo,
  RefundRequestData,
  SupportedChainId,
  X402rChainConfig,
} from '@x402r/core'
// ---------------------------------------------------------------------------
// Core re-exports — values
// ---------------------------------------------------------------------------
export {
  ConfigError,
  ContractCallError,
  computeEscrowNonce,
  computePaymentInfoHash,
  formatFeeBreakdown,
  fromNetworkId,
  getChainConfig,
  isSupportedChain,
  NotImplementedError,
  RefundRequestStatus,
  SubmitterRole,
  supportedChainIds,
  toNetworkId,
  toPaymentInfo,
  ValidationError,
  validateFeeBounds,
  validatePaymentInfo,
  X402rError,
} from '@x402r/core'
export { createX402r } from './client.js'
export type {
  EscrowActions,
  EvidenceActions,
  FreezeActions,
  OperatorActions,
  PaymentActions,
  RefundActions,
  ResolvedConfig,
  WatchActions,
  X402r,
  X402rConfig,
} from './types.js'
