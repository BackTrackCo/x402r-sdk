import { createArbiterClient, type X402rConfig } from '@x402r/sdk'

// Wire an arbiter-scoped client from your app's viem clients. Narrows the
// action surface to the dispute roles (evidence reads, freeze, refund
// approvals). A walletClient is required for the write paths (void, unfreeze).
//
// Create the viem clients however your app already does, e.g.:
//   import { createPublicClient, createWalletClient, http } from 'viem'
//   import { baseSepolia } from 'viem/chains'
//   const publicClient = createPublicClient({ chain: baseSepolia, transport: http() })
//   const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() })
export function wireArbiterClient(
  publicClient: X402rConfig['publicClient'],
  walletClient: NonNullable<X402rConfig['walletClient']>,
  operatorAddress: X402rConfig['operatorAddress'],
) {
  const config: X402rConfig = { publicClient, walletClient, operatorAddress }
  return createArbiterClient(config)
}

// Typical arbiter call shapes (guard optional modules before use):
//
//   // Read a page of submitted evidence for a dispute:
//   const batch = await arbiter.evidence?.getBatch(paymentInfo, 0n, 10n)
//
//   // Void the entire authorization (receiver-gated; full-only):
//   const txHash = await arbiter.payment.voidPayment(paymentInfo)
