import { fromNetworkId, getChainConfig, ValidationError } from '@x402r/core'
import {
  createEscrowActions,
  createEvidenceActions,
  createFreezeActions,
  createOperatorActions,
  createPaymentActions,
  createRefundActions,
  createWatchActions,
} from './actions/index.js'
import { canExecute } from './can-execute.js'
import type { ResolvedConfig, X402r, X402rConfig } from './types.js'

// ---------------------------------------------------------------------------
// Recursive extend builder (viem pattern)
// ---------------------------------------------------------------------------

function buildExtend(base: X402r): X402r['extend'] {
  return (fn) => {
    const extensions = fn(base)
    const safe = { ...extensions }
    // Extensions can fill slots that are undefined on the base client
    // (e.g., providing escrow/freeze when no address was configured).
    // Only defined base keys are protected from override.
    const baseRecord = base as unknown as Record<string, unknown>
    for (const key of Object.keys(base)) {
      if (baseRecord[key] !== undefined) {
        delete (safe as Record<string, unknown>)[key]
      }
    }
    const combined = { ...base, ...safe } as X402r & typeof extensions
    return Object.assign(combined, {
      extend: buildExtend(combined as X402r),
    }) as X402r & typeof extensions
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createX402r(config: X402rConfig): X402r {
  const resolved = resolveConfig(config)

  const base: Omit<X402r, 'extend'> = {
    config: resolved,
    payment: createPaymentActions(resolved),
    escrow: resolved.escrowPeriodAddress
      ? createEscrowActions(resolved, resolved.escrowPeriodAddress)
      : undefined,
    refund: resolved.refundRequestAddress
      ? createRefundActions(resolved, resolved.refundRequestAddress)
      : undefined,
    evidence: createEvidenceActions(resolved),
    freeze: resolved.freezeAddress
      ? createFreezeActions(resolved, resolved.freezeAddress)
      : undefined,
    operator: createOperatorActions(resolved),
    watch: createWatchActions(resolved),
    canExecute: (slot, paymentInfo, amount) =>
      canExecute(resolved, slot, paymentInfo, amount),
  }

  const client = base as X402r
  ;(client as { extend: X402r['extend'] }).extend = buildExtend(client)
  return client
}

// ---------------------------------------------------------------------------
// Config resolution (internal)
// ---------------------------------------------------------------------------

export function resolveConfig(config: X402rConfig): ResolvedConfig {
  const chainId = resolveChainId(config)
  const chainConfig = getChainConfig(chainId)
  const refundRequestEvidenceAddress =
    config.refundRequestEvidenceAddress ?? chainConfig.refundRequestEvidence

  return {
    publicClient: config.publicClient,
    walletClient: config.walletClient,
    operatorAddress: config.operatorAddress,
    chainId,
    chainConfig,
    refundRequestAddress: config.refundRequestAddress ?? undefined,
    refundRequestEvidenceAddress,
    escrowPeriodAddress: config.escrowPeriodAddress,
    freezeAddress: config.freezeAddress,
  }
}

function resolveChainId(config: X402rConfig): number {
  if (config.chainId !== undefined) return config.chainId

  if (config.network !== undefined) return fromNetworkId(config.network)

  const chain = config.publicClient.chain
  if (chain) return chain.id

  throw new ValidationError(
    'Unable to determine chain: provide chainId, network, or a publicClient with a chain',
  )
}
