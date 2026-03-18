import { deployMarketplaceOperator } from '@x402r/core'
import type { Address, PublicClient, WalletClient } from 'viem'

// ---------------------------------------------------------------------------
// Deploy a test operator for scenarios
// ---------------------------------------------------------------------------

export interface TestOperatorDeployment {
  operatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address | null
  refundRequestAddress: Address
}

export async function deployTestOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: {
    chainId: number
    feeRecipient: Address
    arbiter: Address
  },
): Promise<TestOperatorDeployment> {
  console.log('Deploying marketplace operator...')

  const deployment = await deployMarketplaceOperator(
    walletClient,
    publicClient,
    {
      chainId: options.chainId,
      feeRecipient: options.feeRecipient,
      arbiter: options.arbiter,
      escrowPeriodSeconds: 604_800n, // 7 days
      freezeDurationSeconds: 0n,
      operatorFeeBps: 50n,
    },
  )

  console.log(`Operator: ${deployment.operatorAddress}`)
  console.log(
    `  New: ${deployment.summary.newCount}, Existing: ${deployment.summary.existingCount}`,
  )

  return {
    operatorAddress: deployment.operatorAddress,
    escrowPeriodAddress: deployment.escrowPeriodAddress,
    freezeAddress: deployment.freezeAddress,
    refundRequestAddress: deployment.refundRequestAddress,
  }
}
