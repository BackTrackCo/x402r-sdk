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

// File-stems (under examples/scenarios/). The numeric prool key is derived
// from array index (+1, since prool requires positive integers), so a
// duplicate is impossible by construction — a copy-paste bug that gave two
// scenarios the same key would have routed them to the same Anvil child and
// produced silent state crossover. prool's Server.create routes each unique
// numeric subpath (`/1`, `/2`, ...) to its own forked Anvil child instance
// (string subpaths are not supported by prool — see node_modules/prool README).
const SCENARIO_FILES = ['dispute-resolution', 'permit2-charge'] as const
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

  // Cancellation/crash paths bypass the for-loop's finally block, so register
  // explicit handlers that stop prool before exit. Without these, a SIGINT (Ctrl+C)
  // or SIGTERM (CI cancellation) would leave the anvil child + listener bound
  // to PORT, causing EADDRINUSE on the next run.
  const shutdown = async (signal: string, exitCode: number) => {
    console.error(`[scenarios-ci] received ${signal}, stopping prool…`)
    try {
      await server.stop()
    } catch (err) {
      console.error('[scenarios-ci] server.stop() failed during shutdown:', err)
    }
    process.exit(exitCode)
  }
  process.on('SIGINT', () => shutdown('SIGINT', 130))
  process.on('SIGTERM', () => shutdown('SIGTERM', 143))
  process.on('unhandledRejection', (err) => {
    console.error('[scenarios-ci] unhandledRejection:', err)
    shutdown('unhandledRejection', 1)
  })

  let exitCode = 0
  try {
    for (const [index, file] of SCENARIO_FILES.entries()) {
      const key = index + 1
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
