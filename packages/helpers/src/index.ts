export type { ForwardToArbiterOptions } from './forward-to-arbiter.js'
export { forwardToArbiter } from './forward-to-arbiter.js'

// ---------------------------------------------------------------------------
// Re-exports from @x402r/core — unified CREATE3 addresses (same on every chain)
// ---------------------------------------------------------------------------
export {
  arbiterRegistry,
  authCaptureEscrow,
  conditionAddresses,
  factoryAddresses,
  getChainConfig,
  protocolFeeConfig,
  receiverRefundCollector,
  supportedChainIds,
  tokenCollector,
  usdcTvlLimit,
} from '@x402r/core'
