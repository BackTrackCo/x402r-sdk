import {
  type Address,
  type Chain,
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  type PublicClient,
  type TestClient,
  type WalletClient,
} from 'viem'
import { baseSepolia } from 'viem/chains'
import { poolId } from './constants.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnvilInstance {
  start(): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
  rpcUrl: string
  chain: Chain
  getPublicClient(): PublicClient
  getWalletClient(account: Address): WalletClient
  getTestClient(): TestClient
}

// ---------------------------------------------------------------------------
// defineAnvil — creates a lazily-started Anvil fork managed by prool
// ---------------------------------------------------------------------------

export function defineAnvil(options: {
  chain: Chain
  forkUrl: string
  port: number
  forkBlockNumber?: bigint
}): AnvilInstance {
  const { chain, forkUrl, port, forkBlockNumber } = options

  // Pool-isolated RPC URL — each vitest worker gets its own Anvil instance
  const rpcUrl = `http://127.0.0.1:${port}/${poolId}`

  let server: { start(): Promise<void>; stop(): Promise<void> } | undefined

  const transport = http(rpcUrl)

  return {
    rpcUrl,
    chain,

    async start() {
      const { Instance, Server } = await import('prool')
      const srv = Server.create({
        instance: Instance.anvil({
          chainId: chain.id,
          forkUrl,
          forkBlockNumber,
        }),
        port,
      })
      await srv.start()
      server = srv
    },

    async stop() {
      await server?.stop()
    },

    async restart() {
      await this.stop()
      await this.start()
    },

    getPublicClient(): PublicClient {
      return createPublicClient({
        chain,
        transport,
      })
    },

    getWalletClient(account: Address): WalletClient {
      return createWalletClient({
        account,
        chain,
        transport,
      })
    },

    getTestClient(): TestClient {
      return createTestClient({
        chain,
        transport,
        mode: 'anvil',
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Pre-configured instance for Base Sepolia fork
// ---------------------------------------------------------------------------

export const anvilBaseSepolia = defineAnvil({
  chain: baseSepolia,
  forkUrl:
    process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ?? 'https://sepolia.base.org',
  port: 8745,
  forkBlockNumber: 38_381_873n,
})
