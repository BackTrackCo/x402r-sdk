import type { Address } from 'viem'
import { isAddress } from 'viem'
import type { AgentRegistration, ArbiterIdentity } from '../types.js'

const REPUTATION_EXTENSION_KEY = 'reputation'

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
 * Extract agent registrations from the upstream x402 reputation extension.
 *
 * Parses `extensions["reputation"].info.registrations` per the upstream spec
 * (x402-foundation/x402 PR #1024). Returns validated registrations as an array.
 *
 * Agents can have multiple registrations across chains (EVM + Solana).
 * Each registration has a CAIP-10 `agentRegistry` and a string `agentId`.
 *
 * @experimental The upstream x402 reputation extension is not merged.
 * The shape of `extensions["reputation"]` may change.
 * See x402-foundation/x402#931.
 *
 * @param extensions - Extensions object from PaymentRequired or PaymentPayload
 * @returns Array of validated registrations, or empty array if extension is absent
 */
export function extractReputationRegistrations(
  extensions: Record<string, unknown> | undefined,
): AgentRegistration[] {
  if (!extensions) return []

  const ext = extensions[REPUTATION_EXTENSION_KEY]
  if (ext === null || ext === undefined || typeof ext !== 'object') return []

  const info = (ext as Record<string, unknown>).info
  if (info === null || info === undefined || typeof info !== 'object') return []

  const registrations = (info as Record<string, unknown>).registrations
  if (!Array.isArray(registrations)) return []

  const result: AgentRegistration[] = []
  for (const entry of registrations) {
    if (entry === null || entry === undefined || typeof entry !== 'object')
      continue

    const record = entry as Record<string, unknown>
    const agentId = coerceAgentId(record.agentId)
    if (agentId === undefined) continue

    const agentRegistry = record.agentRegistry
    if (typeof agentRegistry !== 'string' || agentRegistry.length === 0)
      continue

    result.push({ agentId, agentRegistry })
  }

  return result
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
