/**
 * Deploy a short-escrow operator for E2E testing.
 *
 * Uses 60s escrow period and 30s freeze duration so the full
 * lifecycle (pay → freeze/unfreeze → release/refund) can be
 * tested within a single session.
 *
 * Usage:
 *   PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/deploy-short-escrow.ts
 */

import {
  deployMarketplaceOperator,
  fromNetworkId,
  previewMarketplaceOperator,
} from '@x402r/core'
import { createPublicClient, createWalletClient, formatEther, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const NETWORK_ID = 'eip155:84532' // Base Sepolia
const RPC_URL = 'https://sepolia.base.org'

async function main() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is required')
    console.error(
      'Usage: PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/deploy-short-escrow.ts',
    )
    process.exit(1)
  }

  const account = privateKeyToAccount(privateKey)
  console.log('Deployer address:', account.address)

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const balance = await publicClient.getBalance({ address: account.address })
  console.log('Balance:', formatEther(balance), 'ETH')

  if (balance === 0n) {
    console.error(
      'Error: No ETH balance. Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet',
    )
    process.exit(1)
  }

  // Short-escrow configuration for E2E testing
  const options = {
    feeRecipient: account.address,
    arbiter: account.address,
    escrowPeriodSeconds: 300n, // 5 minutes (instead of 7 days)
    freezeDurationSeconds: 180n, // 3 minutes (instead of 3 days)
    operatorFeeBps: 100n, // 1% operator fee
  }

  console.log('\n--- Configuration (Short Escrow) ---')
  console.log('Fee recipient:', options.feeRecipient)
  console.log('Arbiter:', options.arbiter)
  console.log('Escrow period:', Number(options.escrowPeriodSeconds), 'seconds')
  console.log(
    'Freeze duration:',
    Number(options.freezeDurationSeconds),
    'seconds',
  )
  console.log('Operator fee:', Number(options.operatorFeeBps) / 100, '%')

  // Preview addresses before deployment
  console.log('\n--- Preview Addresses ---')
  const chainId = fromNetworkId(NETWORK_ID)
  const deployOptions = { chainId, ...options }
  const preview = await previewMarketplaceOperator(publicClient, deployOptions)
  console.log('Operator:', preview.operatorAddress)
  console.log('EscrowPeriod:', preview.escrowPeriodAddress)
  console.log('Freeze:', preview.freezeAddress)
  console.log('SignatureCondition:', preview.signatureConditionAddress)
  console.log(
    'RefundInEscrowCondition:',
    preview.refundInEscrowConditionAddress,
  )
  console.log('FeeCalculator:', preview.feeCalculatorAddress)

  // Deploy
  console.log('\n--- Deploying ---')
  const startTime = Date.now()

  const result = await deployMarketplaceOperator(
    walletClient,
    publicClient,
    deployOptions,
  )

  const elapsed = (Date.now() - startTime) / 1000
  console.log(`Deployment completed in ${elapsed.toFixed(1)}s`)

  // Summary
  console.log('\n--- Deployment Summary ---')
  console.log('New deployments:', result.summary.newCount)
  console.log('Already existed:', result.summary.existingCount)
  console.log('Transaction count:', result.summary.txHashes.length)

  console.log('\n--- Deployed Addresses ---')
  console.log('PaymentOperator:', result.operatorAddress)
  console.log('EscrowPeriod:', result.escrowPeriodAddress)
  console.log('Freeze:', result.freezeAddress)
  console.log('SignatureCondition:', result.signatureConditionAddress)
  console.log('RefundInEscrowCondition:', result.refundInEscrowConditionAddress)
  if (result.feeCalculatorAddress) {
    console.log('FeeCalculator:', result.feeCalculatorAddress)
  }

  if (result.summary.txHashes.length > 0) {
    console.log('\n--- Transaction Hashes ---')
    result.summary.txHashes.forEach((hash, i) => {
      console.log(`${i + 1}. https://sepolia.basescan.org/tx/${hash}`)
    })
  }

  // Output env-friendly format for easy copy-paste
  console.log('\n--- .env Values ---')
  console.log(`OPERATOR_ADDRESS=${result.operatorAddress}`)
  console.log(`ESCROW_PERIOD_ADDRESS=${result.escrowPeriodAddress}`)
  console.log(`FREEZE_ADDRESS=${result.freezeAddress}`)
}

main().catch((error) => {
  console.error('Deployment failed:', error)
  process.exit(1)
})
