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
  forkUrl?: string
  port: number
  forkBlockNumber?: bigint
  /** RPC URL subpath under the prool server port. Defaults to '1'. */
  rpcSubpath?: string | number
}): AnvilInstance {
  const { chain, port, forkBlockNumber } = options
  // forkUrl default lives here so every harness shares the same public-RPC
  // fallback when the env override is unset.
  const forkUrl =
    options.forkUrl ??
    process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ??
    'https://sepolia.base.org'

  // Subpath-isolated RPC URL — vitest passes its poolId so each worker gets
  // its own Anvil instance; standalone harnesses pass a fixed subpath.
  const rpcSubpath = options.rpcSubpath ?? '1'
  const rpcUrl = `http://127.0.0.1:${port}/${rpcSubpath}`

  let server: { stop(): Promise<void> } | undefined

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
        cacheTime: 0,
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
