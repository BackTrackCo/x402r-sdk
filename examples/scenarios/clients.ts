import {
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
} from '@x402r/sdk'
import type { Address, PublicClient, WalletClient } from 'viem'

// ---------------------------------------------------------------------------
// Create role-specific SDK clients for scenarios
// ---------------------------------------------------------------------------

export interface ScenarioClients {
  payer: ReturnType<typeof createPayerClient>
  merchant: ReturnType<typeof createMerchantClient>
  arbiter: ReturnType<typeof createArbiterClient>
}

export function createScenarioClients(options: {
  publicClient: PublicClient
  operatorAddress: Address
  escrowPeriodAddress: Address
  refundRequestAddress: Address
  freezeAddress?: Address
  payerWallet: WalletClient
  merchantWallet: WalletClient
  arbiterWallet: WalletClient
}): ScenarioClients {
  const baseConfig = {
    publicClient: options.publicClient,
    operatorAddress: options.operatorAddress,
    escrowPeriodAddress: options.escrowPeriodAddress,
    refundRequestAddress: options.refundRequestAddress,
    freezeAddress: options.freezeAddress,
  }

  const payer = createPayerClient({
    ...baseConfig,
    walletClient: options.payerWallet,
  })

  const merchant = createMerchantClient({
    ...baseConfig,
    walletClient: options.merchantWallet,
  })

  const arbiter = createArbiterClient({
    ...baseConfig,
    walletClient: options.arbiterWallet,
  })

  // Runtime guards — verify optional modules are available
  if (!payer.refund) {
    throw new Error(
      'Payer refund module not available — operator may not have RefundRequest configured',
    )
  }
  if (!arbiter.refund) {
    throw new Error(
      'Arbiter refund module not available — operator may not have RefundRequest configured',
    )
  }

  return { payer, merchant, arbiter }
}
