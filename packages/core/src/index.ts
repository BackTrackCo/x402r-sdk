// ---------------------------------------------------------------------------
// ABIs (auto-generated — keep export *)
// ---------------------------------------------------------------------------
export * from './abis/generated.js'
export type {
  ConditionSingletonAddresses,
  FactoryAddresses,
  SupportedChainId,
  TokenInfo,
  X402rChainConfig,
} from './config/index.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export {
  fromNetworkId,
  getChainConfig,
  getConditionSingletons,
  getFactoryAddress,
  getFactoryAddresses,
  getTokenInfo,
  hasConditionSingletons,
  hasFactories,
  isSupportedChain,
  KNOWN_TOKEN_INFO,
  supportedChainIds,
  toNetworkId,
  x402rChains,
} from './config/index.js'
export type { X402rErrorArgs } from './errors/index.js'

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export {
  ConfigError,
  ContractCallError,
  NotImplementedError,
  ValidationError,
  X402rError,
} from './errors/index.js'
export type {
  EscrowExtra,
  PaymentOption,
  RefundableOptions,
} from './helpers/index.js'
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export { refundable } from './helpers/index.js'
// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export { wrapContractCall } from './operations/error-wrapping.js'
export { SubmitterRole, submitEvidence } from './operations/evidence.js'
export type { FeeAddresses, FeeCalculationResult } from './operations/fees.js'
export {
  calculateOperatorFeeBps,
  calculateProtocolFeeBps,
  calculateTotalFees,
  distributeFees,
  formatFeeBreakdown,
  getFeeAddresses,
  validateFeeBounds,
} from './operations/fees.js'
export { freezePayment, unfreezePayment } from './operations/freeze.js'
export { getPaymentState } from './operations/payment-state.js'
export {
  approveRefundWithSignature,
  cancelRefundRequest,
  denyRefundRequest,
  RefundRequestStatus,
  refuseRefundRequest,
  requestRefund,
} from './operations/refund.js'
export { refundInEscrow, refundPostEscrow } from './operations/refund-budget.js'
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
