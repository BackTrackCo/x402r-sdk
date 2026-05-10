// ---------------------------------------------------------------------------
// SDK — factory + client
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Core re-exports — types
// ---------------------------------------------------------------------------
export type {
  ConditionSlot,
  EvidenceEntry,
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
  computePaymentInfoHash,
  formatFeeBreakdown,
  getChainConfig,
  isSupportedChain,
  RefundRequestStatus,
  SubmitterRole,
  supportedChainIds,
  ValidationError,
  validateFeeBounds,
  validatePaymentInfo,
  X402rError,
} from '@x402r/core'
export type { ResolvedAgent } from '@x402r/erc8004/identity'
export type { ResolvedServiceEndpoint } from '@x402r/erc8004/registration'
export type { ReputationSummary } from '@x402r/erc8004/reputation'
// ---------------------------------------------------------------------------
// Wire-format re-exports from @x402r/evm — so SDK consumers can construct and
// narrow PaymentRequirements/PaymentPayload without taking a direct dep.
// ---------------------------------------------------------------------------
export type {
  AuthCaptureExtra,
  AuthCapturePayload,
  Eip3009Payload,
  PaymentInfoStruct,
  Permit2Payload,
} from '@x402r/evm'
export {
  isAuthCaptureExtra,
  isAuthCapturePayload,
  isEip3009Payload,
  isPermit2Payload,
} from '@x402r/evm'
export {
  DEFAULT_FEEDBACK_TAG1,
  DEFAULT_FEEDBACK_TAG2,
} from './actions/erc8004.js'
export {
  extractArbiterIdentity,
  extractReputationRegistrations,
  fetchArbiterIdentity,
} from './actions/erc8004-helpers.js'
export { createX402r } from './client.js'
export { erc8004Actions, queryActions } from './plugins/index.js'
export {
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
} from './presets.js'
export { createMemoryStore } from './store/index.js'
export type { PaymentStore } from './store/types.js'
export type {
  AgentRegistration,
  ArbiterClient,
  ArbiterIdentity,
  CheckAgentResult,
  Erc8004DiscoveryActions,
  Erc8004GiveFeedbackParams,
  Erc8004IdentityActions,
  Erc8004PluginOptions,
  Erc8004ReputationActions,
  EscrowActions,
  EvidenceActions,
  FreezeActions,
  MerchantClient,
  OperatorActions,
  PayerClient,
  PaymentActions,
  Prettify,
  QueryActions,
  RefundActions,
  ResolvedConfig,
  ResolvedWriteConfig,
  WatchActions,
  X402r,
  X402rConfig,
} from './types.js'
