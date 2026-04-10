import type { Address } from 'viem'
import { isAddress } from 'viem'
import type { ArbiterIdentity, MerchantIdentity } from '../types.js'

const REPUTATION_EXTENSION_KEY = '8004-reputation'

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

  const rawAgentId = info.agentId
  if (rawAgentId === undefined || rawAgentId === null) return undefined

  const agentId =
    typeof rawAgentId === 'bigint'
      ? rawAgentId
      : typeof rawAgentId === 'number'
        ? BigInt(rawAgentId)
        : undefined
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

  const rawAgentId = data.agentId
  if (rawAgentId === undefined || rawAgentId === null) return undefined

  const agentId =
    typeof rawAgentId === 'bigint'
      ? rawAgentId
      : typeof rawAgentId === 'number'
        ? BigInt(rawAgentId)
        : undefined
  if (agentId === undefined) return undefined

  const agentRegistry = data.agentRegistry
  if (typeof agentRegistry !== 'string') return undefined

  return { agentId, agentRegistry }
}

/**
 * Fetch arbiter identity from the `/attest/identity` endpoint.
 *
 * POSTs to the same endpoint used by the attestation extension.
 * Use at merchant startup to verify the arbiter before serving customers.
 *
 * Returns `undefined` if the arbiter doesn't include an agentId.
 *
 * @param arbiterUrl - Base URL of the arbiter service
 */
export async function fetchArbiterIdentity(
  arbiterUrl: string,
): Promise<ArbiterIdentity | undefined> {
  const base = arbiterUrl.endsWith('/') ? arbiterUrl.slice(0, -1) : arbiterUrl
  const url = `${base}/attest/identity`
  const fetchFn = (globalThis as Record<string, unknown>).fetch as (
    url: string,
    init: Record<string, unknown>,
  ) => Promise<{ ok: boolean; json(): Promise<unknown> }>
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!response.ok) return undefined

  const json: unknown = await response.json()
  return extractArbiterIdentity(json)
}
