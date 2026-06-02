// ---------------------------------------------------------------------------
// Re-exports from @x402r/core — unified CREATE3 addresses (same on every chain)
// ---------------------------------------------------------------------------
export {
  authCaptureEscrow,
  conditions,
  factories,
  getChainConfig,
  protocolFeeConfig,
  receiverRefundCollector,
  supportedChainIds,
  tokenCollector,
} from '@x402r/core'
// Wire-format type re-exports from @x402r/evm so consumers can construct and
// narrow PaymentRequirements/PaymentPayload without taking a direct dep.
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
export type { ForwardToArbiterOptions } from './forward-to-arbiter.js'
export { forwardToArbiter } from './forward-to-arbiter.js'
export type { ReconstructPaymentInfoWireReturnType } from './reconstruct-payment-info.js'
export { reconstructPaymentInfoWire } from './reconstruct-payment-info.js'
export type {
  X402rDefaultsExtra,
  X402rDefaultsInput,
} from './x402r-defaults.js'
export { x402rDefaults } from './x402r-defaults.js'
