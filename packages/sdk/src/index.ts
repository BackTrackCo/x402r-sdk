// ---------------------------------------------------------------------------
// SDK — createX402r client
// ---------------------------------------------------------------------------
export { createX402r } from './client.js'
export { resolveConfig } from './config.js'
export type {
  EvidenceActions,
  FeeActions,
  FreezeActions,
  OperatorActions,
  PaymentActions,
  RefundActions,
  ResolvedConfig,
  X402r,
  X402rConfig,
} from './types.js'

// ---------------------------------------------------------------------------
// Re-exports from @x402r/core — commonly needed types, config, errors, utils
// ---------------------------------------------------------------------------

// Types
// Config
// Errors
// Operation types
export type {
  ConditionConfig,
  ConditionSingletonAddresses,
  ConditionSlot,
  EvidenceEntry,
  FactoryAddresses,
  FeeAddresses,
  FeeCalculationResult,
  OperatorConfig,
  OperatorSlots,
  PaymentAmounts,
  PaymentInfo,
  RefundRequestData,
  SupportedChainId,
  X402rChainConfig,
  X402rErrorArgs,
} from '@x402r/core'
// Constants
// Payment utilities
export {
  ConfigError,
  ContractCallError,
  computeEscrowNonce,
  computePaymentInfoHash,
  getChainConfig,
  isSupportedChain,
  NotImplementedError,
  RefundRequestStatus,
  SubmitterRole,
  supportedChainIds,
  ValidationError,
  validatePaymentInfo,
  X402rError,
  x402rChains,
} from '@x402r/core'
