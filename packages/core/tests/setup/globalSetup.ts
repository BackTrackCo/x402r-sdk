import { anvilBaseSepolia } from './anvil.js'

export default async function globalSetup() {
  if (process.env.SKIP_GLOBAL_SETUP) {
    return () => {}
  }

  await anvilBaseSepolia.start()
  return () => anvilBaseSepolia.stop()
}
