import { afterAll, beforeAll } from 'vitest'
import { anvilBaseSepolia } from './anvil.js'

// Per-file Anvil snapshot/revert isolation. vitest re-executes this module
// once per test file (isolate: true), so `snapshotId` resets per file. Anvil
// consumes the snapshot id on revert (HashMap.remove in revert_state_snapshot;
// Hardhat docs document the same constraint on the same RPC), so no reuse
// path is needed — the next file's beforeAll takes a fresh snapshot.
//
// `retry: 3` on the core:fork project reuses the same snapshot across retries
// of a failed test — state mutations from a failed-then-retried test still
// leak into the next attempt. Pre-existing; unchanged by this hook.
let snapshotId: `0x${string}` | undefined

beforeAll(async () => {
  const testClient = anvilBaseSepolia.getTestClient()
  snapshotId = await testClient.snapshot()
})

afterAll(async () => {
  if (snapshotId === undefined) return
  const testClient = anvilBaseSepolia.getTestClient()
  await testClient.revert({ id: snapshotId })
  snapshotId = undefined
})
