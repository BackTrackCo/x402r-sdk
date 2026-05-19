// CI orchestrator for the `scenarios:ci` script. Starts ONE prool server and
// hands each scenario subprocess a unique numeric pool key (`/1`, `/2`, ...).
// prool routes each key to its own forked Anvil child, so scenarios are
// isolated without competing for the same TCP port.
//
// Mirrors the pattern used by fork tests:
//   packages/core/tests/setup/anvil.ts:43   (poolId-keyed subpath)
//   packages/core/tests/setup/globalSetup.ts:9 (single server lifecycle)
//
// Side benefit: one prool means one upstream fork operation against
// Base Sepolia public RPC per CI run, instead of one per scenario.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// File-stem (under examples/scenarios/) paired with the numeric prool key
// used for the per-scenario route. prool's Server.create routes each unique
// numeric subpath (`/1`, `/2`, ...) to its own forked Anvil child instance
// (string subpaths are not supported by prool — see node_modules/prool README).
const SCENARIOS = [
  { file: 'dispute-resolution', key: 1 },
  { file: 'permit2-charge', key: 2 },
] as const
const PORT = 8846
const CHAIN_ID = 84532

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scenarioFile = (file: string) =>
  path.resolve(__dirname, '..', 'scenarios', `${file}.ts`)

function scenarioRpcUrl(key: number): string {
  return `http://127.0.0.1:${PORT}/${key}`
}

async function runScenario(file: string, key: number): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('tsx', [scenarioFile(file)], {
      stdio: 'inherit',
      env: { ...process.env, SCENARIO_RPC_URL: scenarioRpcUrl(key) },
    })
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', (err) => {
      console.error(`Failed to spawn scenario ${file}:`, err)
      resolve(1)
    })
  })
}

async function main(): Promise<void> {
  const { Instance, Server } = await import('prool')
  const server = Server.create({
    instance: Instance.anvil({
      chainId: CHAIN_ID,
      forkUrl:
        process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ??
        'https://sepolia.base.org',
    }),
    port: PORT,
  })
  await server.start()

  let exitCode = 0
  try {
    for (const { file, key } of SCENARIOS) {
      const code = await runScenario(file, key)
      if (code !== 0) {
        exitCode = code
        break
      }
    }
  } finally {
    await server.stop()
  }
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
