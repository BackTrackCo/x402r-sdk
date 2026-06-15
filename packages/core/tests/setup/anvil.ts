import { type AnvilInstance, defineAnvil } from '@x402r/test-fixtures'
import { baseSepolia } from 'viem/chains'
import { poolId } from './constants.js'

export type { AnvilInstance }

// ---------------------------------------------------------------------------
// Pre-configured instance for Base Sepolia fork
// ---------------------------------------------------------------------------

export const anvilBaseSepolia = defineAnvil({
  chain: baseSepolia,
  forkUrl:
    process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ?? 'https://sepolia.base.org',
  port: 8745,
  // Pool-isolated RPC subpath — each vitest worker gets its own Anvil instance.
  rpcSubpath: poolId,
  // FORK_BLOCK intentionally unpinned — Base Sepolia public RPC has a narrow
  // archive horizon (~last few hundred blocks). Pinning a fixed historical
  // block fails with "block not found" / 400 Bad Request once the chain
  // moves past that horizon. Anvil forks at upstream's latest by default,
  // which always works against the public RPC. Trade-off: tests run against
  // moving on-chain state. Acceptable for fork tests since they validate
  // canonical contracts at addresses that are stable across blocks.
})
