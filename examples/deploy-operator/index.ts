/**
 * Example: Deploy a Marketplace Operator
 *
 * This example shows how to deploy a complete marketplace payment operator
 * with escrow, freeze, and arbiter-assisted refund support.
 *
 * Prerequisites:
 * - Node.js 20+
 * - Private key with Base Sepolia ETH for gas
 *
 * Usage:
 *   PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts
 */

import { createWalletClient, createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  deployMarketplaceOperator,
  previewMarketplaceOperator,
} from '../../packages/core/dist/index.js';

// Network configuration
const NETWORK_ID = 'eip155:84532'; // Base Sepolia
const RPC_URL = 'https://sepolia.base.org';

async function main() {
  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is required');
    console.error('Usage: PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts');
    process.exit(1);
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey);
  console.log('Deployer address:', account.address);

  // Create viem clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Balance:', formatEther(balance), 'ETH');

  if (balance === 0n) {
    console.error('Error: No ETH balance. Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    process.exit(1);
  }

  // Configuration for the marketplace operator
  const options = {
    feeRecipient: account.address, // Receive operator fees
    arbiter: account.address, // Self as arbiter for testing
    escrowPeriodSeconds: 604800n, // 7 days
    freezeDurationSeconds: 259200n, // 3 days max freeze
    operatorFeeBps: 100n, // 1% operator fee
  };

  console.log('\n--- Configuration ---');
  console.log('Fee recipient:', options.feeRecipient);
  console.log('Arbiter:', options.arbiter);
  console.log('Escrow period:', Number(options.escrowPeriodSeconds) / 86400, 'days');
  console.log('Freeze duration:', Number(options.freezeDurationSeconds) / 86400, 'days');
  console.log('Operator fee:', Number(options.operatorFeeBps) / 100, '%');

  // Preview addresses before deployment
  console.log('\n--- Preview Addresses ---');
  const preview = await previewMarketplaceOperator(publicClient, NETWORK_ID, options);
  console.log('Operator:', preview.operatorAddress);
  console.log('EscrowPeriod:', preview.escrowPeriodAddress);
  console.log('FreezePolicy:', preview.freezePolicyAddress);
  console.log('Freeze:', preview.freezeAddress);
  console.log('ArbiterCondition:', preview.arbiterConditionAddress);
  console.log('RefundInEscrowCondition:', preview.refundInEscrowCondition);
  console.log('FeeCalculator:', preview.feeCalculatorAddress);

  // Deploy
  console.log('\n--- Deploying ---');
  const startTime = Date.now();

  const result = await deployMarketplaceOperator(
    walletClient,
    publicClient,
    NETWORK_ID,
    options
  );

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`Deployment completed in ${elapsed.toFixed(1)}s`);

  // Summary
  console.log('\n--- Deployment Summary ---');
  console.log('New deployments:', result.summary.newDeployments);
  console.log('Already existed:', result.summary.existingContracts);
  console.log('Transaction count:', result.txHashes.length);

  console.log('\n--- Deployed Addresses ---');
  console.log('PaymentOperator:', result.operatorAddress);
  console.log('EscrowPeriod:', result.escrowPeriodAddress);
  console.log('FreezePolicy:', result.freezePolicyAddress);
  console.log('Freeze:', result.freezeAddress);
  console.log('ArbiterCondition:', result.arbiterConditionAddress);
  console.log('RefundInEscrowCondition:', result.refundInEscrowCondition);
  if (result.feeCalculatorAddress) {
    console.log('FeeCalculator:', result.feeCalculatorAddress);
  }

  if (result.txHashes.length > 0) {
    console.log('\n--- Transaction Hashes ---');
    result.txHashes.forEach((hash, i) => {
      console.log(`${i + 1}. https://sepolia.basescan.org/tx/${hash}`);
    });
  }

  console.log('\n--- Next Steps ---');
  console.log('1. Use this operator address in your payment payload:');
  console.log(`   operator: "${result.operatorAddress}"`);
  console.log('\n2. Configure your merchant to accept payments via this operator');
  console.log('\n3. Test the payment flow:');
  console.log('   - Authorize payment → funds enter escrow');
  console.log('   - Wait for escrow period OR request refund');
  console.log('   - Release funds OR process refund');
}

main().catch((error) => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
