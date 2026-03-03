import { anvilBaseSepolia } from './anvil.js'

export default async function globalSetup() {
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 22 || process.env.SKIP_GLOBAL_SETUP) {
    return () => {}
  }

  await anvilBaseSepolia.start()
  return () => anvilBaseSepolia.stop()
}
