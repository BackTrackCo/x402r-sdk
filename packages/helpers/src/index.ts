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
export type { ForwardToArbiterOptions } from './forward-to-arbiter.js'
export { forwardToArbiter } from './forward-to-arbiter.js'
