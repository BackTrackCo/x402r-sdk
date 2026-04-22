import type { Chain } from 'viem'
import * as chains from 'viem/chains'
import { Malformed402Error } from './errors.js'

const BY_ID = buildIndex()

function buildIndex(): Record<number, Chain> {
  const out: Record<number, Chain> = {}
  for (const value of Object.values(chains)) {
    if (isChain(value)) out[value.id] = value
  }
  return out
}

function isChain(value: unknown): value is Chain {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'number' &&
    'rpcUrls' in value
  )
}

/**
 * Parse an x402 `Network` string (e.g., `"eip155:84532"`) into a numeric
 * chain ID. Solana and other non-EVM namespaces are rejected — this CLI only
 * supports EVM schemes.
 */
export function parseChainId(network: string): number {
  const [namespace, id] = network.split(':')
  if (namespace !== 'eip155' || !id) {
    throw new Malformed402Error(
      `unsupported network "${network}"; only eip155 chains are supported`,
    )
  }
  const chainId = Number(id)
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Malformed402Error(`invalid chain id in network "${network}"`)
  }
  return chainId
}

/**
 * Resolve a viem `Chain` by numeric id, optionally overriding the RPC URL.
 * Unknown chains synthesize a minimal `Chain` object if `rpcUrl` is provided.
 */
export function resolveChain(chainId: number, rpcUrl?: string): Chain {
  const known = BY_ID[chainId]
  if (known) {
    return rpcUrl
      ? { ...known, rpcUrls: { default: { http: [rpcUrl] } } }
      : known
  }
  if (!rpcUrl) {
    throw new Malformed402Error(
      `unknown chain id ${chainId}; pass --rpc <url> to use an unrecognized chain`,
    )
  }
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  }
}
