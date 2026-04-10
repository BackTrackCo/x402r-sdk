import type { Address } from 'viem'
import { isAddress } from 'viem'
import type { ArbiterIdentity, MerchantIdentity } from '../types.js'

const REPUTATION_EXTENSION_KEY = '8004-reputation'
const CAIP10_PATTERN = /^eip155:\d+:0x[0-9a-fA-F]{40}$/

/** Coerce a raw value to bigint. Accepts bigint, number, or numeric string. */
function coerceAgentId(raw: unknown): bigint | undefined {
  if (typeof raw === 'bigint') return raw
  if (typeof raw === 'number') return BigInt(raw)
  if (typeof raw === 'string') {
    try {
      return BigInt(raw)
    } catch {
      return undefined
    }
  }
  return undefined
}

/**
 * Extract arbiter identity from an attestation extension response.
 *
 * The attestation extension is a generic pass-through — its response is `unknown`.
 * This helper validates the shape and extracts `{ agentId, address }`.
 *
 * Returns `undefined` if agentId is not present (arbiter hasn't registered,
 * or attestation extension is absent).
 *
 * @param attestationInfo - The raw attestation identity (`paymentRequired.extensions?.attestation?.info?.identity`)
 */
export function extractArbiterIdentity(
  attestationInfo: unknown,
): ArbiterIdentity | undefined {
  if (
    attestationInfo === null ||
    attestationInfo === undefined ||
    typeof attestationInfo !== 'object'
  )
    return undefined

  const info = attestationInfo as Record<string, unknown>

  const agentId = coerceAgentId(info.agentId)
  if (agentId === undefined) return undefined

  const address = info.arbiter
  if (typeof address !== 'string' || !isAddress(address)) return undefined

  return { agentId, address: address as Address }
}

/**
 * Extract merchant identity from the upstream x402 reputation extension.
 *
 * Parses `extensions["8004-reputation"]` for `{ agentId, agentRegistry }`.
 * Returns `undefined` if the extension is not present or the shape doesn't match.
 *
 * @experimental The upstream x402 reputation extension (PR #1024 spec, PR #1070
 * implementation) is not merged. The shape of `extensions["8004-reputation"]`
 * may change. This helper is subject to breaking changes.
 *
 * @param extensions - Extensions object from PaymentRequired or PaymentPayload
 */
export function extractMerchantIdentity(
  extensions: Record<string, unknown> | undefined,
): MerchantIdentity | undefined {
  if (!extensions) return undefined

  const raw = extensions[REPUTATION_EXTENSION_KEY]
  if (raw === null || raw === undefined || typeof raw !== 'object')
    return undefined

  const data = raw as Record<string, unknown>

  const agentId = coerceAgentId(data.agentId)
  if (agentId === undefined) return undefined

  const agentRegistry = data.agentRegistry
  if (typeof agentRegistry !== 'string' || !CAIP10_PATTERN.test(agentRegistry))
    return undefined

  return {
    agentId,
    agentRegistry: agentRegistry as MerchantIdentity['agentRegistry'],
  }
}

/**
 * Fetch arbiter identity from the `/attest/identity` endpoint.
 *
 * POSTs to the same endpoint used by the attestation extension.
 * Use at merchant startup to verify the arbiter before serving customers.
 *
 * Returns `undefined` if the arbiter doesn't include an agentId.
 * Network errors (DNS, connection refused) propagate as thrown exceptions.
 *
 * @param arbiterUrl - Base URL of the arbiter service
 */
export async function fetchArbiterIdentity(
  arbiterUrl: string,
): Promise<ArbiterIdentity | undefined> {
  const base = arbiterUrl.endsWith('/') ? arbiterUrl.slice(0, -1) : arbiterUrl
  const url = `${base}/attest/identity`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!response.ok) return undefined

  const json: unknown = await response.json()
  return extractArbiterIdentity(json)
}
