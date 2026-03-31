import { ValidationError } from '@x402r/core'

/** Minimal deployment context for persistence (addresses only). */
export interface DeployContext {
  operatorAddress: `0x${string}`
  escrowPeriodAddress: `0x${string}`
  arbiterConditionAddress: `0x${string}`
}

/**
 * Extract the minimal deploy context from a deployment result.
 *
 * Returns a JSON-serializable object containing only the addresses
 * needed to interact with the deployed operator.
 *
 * @example
 * ```ts
 * import { toDeployContext } from '@x402r/helpers'
 * import { writeFileSync } from 'node:fs'
 *
 * const deployment = await deployDeliveryProtectionOperator(wallet, public, opts)
 * writeFileSync('context.json', JSON.stringify(toDeployContext(deployment), null, 2))
 * ```
 */
export function toDeployContext(deployment: DeployContext): DeployContext {
  return {
    operatorAddress: deployment.operatorAddress,
    escrowPeriodAddress: deployment.escrowPeriodAddress,
    arbiterConditionAddress: deployment.arbiterConditionAddress,
  }
}

/**
 * Parse and validate a deploy context from a plain object (e.g. parsed JSON).
 *
 * @example
 * ```ts
 * import { parseDeployContext } from '@x402r/helpers'
 * import { readFileSync } from 'node:fs'
 *
 * const raw = JSON.parse(readFileSync('context.json', 'utf-8'))
 * const ctx = parseDeployContext(raw)
 * // ctx.operatorAddress, ctx.escrowPeriodAddress, ctx.arbiterConditionAddress
 * ```
 */
export function parseDeployContext(raw: unknown): DeployContext {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Expected an object for deploy context')
  }
  const obj = raw as Record<string, unknown>
  if (
    typeof obj.operatorAddress !== 'string' ||
    typeof obj.escrowPeriodAddress !== 'string' ||
    typeof obj.arbiterConditionAddress !== 'string'
  ) {
    throw new ValidationError(
      'Invalid deploy context: missing required address fields (operatorAddress, escrowPeriodAddress, arbiterConditionAddress)',
    )
  }
  return {
    operatorAddress: obj.operatorAddress as `0x${string}`,
    escrowPeriodAddress: obj.escrowPeriodAddress as `0x${string}`,
    arbiterConditionAddress: obj.arbiterConditionAddress as `0x${string}`,
  }
}
