// ---------------------------------------------------------------------------
// Re-exports from @x402r/core — unified CREATE3 addresses (same on every chain)
// ---------------------------------------------------------------------------
export {
  arbiterRegistry,
  authCaptureEscrow,
  conditions,
  factories,
  getChainConfig,
  protocolFeeConfig,
  receiverRefundCollector,
  supportedChainIds,
  tokenCollector,
  usdcTvlLimit,
} from '@x402r/core'
export type { DeployContext } from './deploy-context.js'
export { parseDeployContext, toDeployContext } from './deploy-context.js'
export type { ForwardToArbiterOptions } from './forward-to-arbiter.js'
export { forwardToArbiter } from './forward-to-arbiter.js'
export type { ParsedForwardedPayload } from './parse-forwarded-payload.js'
export { parseForwardedPayload } from './parse-forwarded-payload.js'
