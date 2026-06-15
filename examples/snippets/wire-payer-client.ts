import { createPayerClient, type X402rConfig } from '@x402r/sdk'

// Wire a payer-scoped client from your app's viem clients. `createPayerClient`
// narrows the action surface to the payer role (refund.request,
// evidence.submit, …); a walletClient is required for write operations. For a
// read-only or dual-role wallet use `createX402r` instead.
//
// Create the viem clients however your app already does, e.g.:
//   import { createPublicClient, createWalletClient, http } from 'viem'
//   import { baseSepolia } from 'viem/chains'
//   const publicClient = createPublicClient({ chain: baseSepolia, transport: http() })
//   const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() })
export function wirePayerClient(
  publicClient: X402rConfig['publicClient'],
  walletClient: NonNullable<X402rConfig['walletClient']>,
  operatorAddress: X402rConfig['operatorAddress'],
) {
  const config: X402rConfig = { publicClient, walletClient, operatorAddress }
  return createPayerClient(config)
}
