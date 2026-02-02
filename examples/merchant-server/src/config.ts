/**
 * Merchant Server Configuration
 * Loads environment variables and builds payment requirements
 */

import { getNetworkConfig } from '@x402r/core';
import { refundable } from '@x402r/helpers';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Network configuration
export const NETWORK_ID = 'eip155:84532'; // Base Sepolia
export const RPC_URL = 'https://sepolia.base.org';

// Price in USDC (6 decimals): $0.01 = 10000
export const PRICE_USDC = '10000';

export interface ServerConfig {
  privateKey: `0x${string}`;
  operatorAddress: `0x${string}`;
  freezeAddress: `0x${string}`;
  escrowPeriodAddress: `0x${string}`;
  port: number;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is required');
    console.error('\nFirst, deploy an operator:');
    console.error('  PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts');
    console.error('\nThen copy the addresses to .env file');
    process.exit(1);
  }

  const operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;
  if (!operatorAddress) {
    console.error('Error: OPERATOR_ADDRESS environment variable is required');
    console.error('\nRun deploy-operator first to get the operator address');
    process.exit(1);
  }

  const freezeAddress = process.env.FREEZE_ADDRESS as `0x${string}`;
  if (!freezeAddress) {
    console.error('Error: FREEZE_ADDRESS environment variable is required');
    console.error('\nRun deploy-operator first to get the freeze address');
    process.exit(1);
  }

  const escrowPeriodAddress = process.env.ESCROW_PERIOD_ADDRESS as `0x${string}`;
  if (!escrowPeriodAddress) {
    console.error('Error: ESCROW_PERIOD_ADDRESS environment variable is required');
    console.error('\nRun deploy-operator first to get the escrow period address');
    process.exit(1);
  }

  return {
    privateKey,
    operatorAddress,
    freezeAddress,
    escrowPeriodAddress,
    port: parseInt(process.env.PORT || '3000', 10),
  };
}

/**
 * Create viem clients for blockchain interaction
 */
export function createClients(config: ServerConfig) {
  const account = privateKeyToAccount(config.privateKey);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  return { publicClient, walletClient, account };
}

/**
 * Build payment requirements for x402 responses
 */
export function buildPaymentRequirements(
  merchantAddress: `0x${string}`,
  operatorAddress: `0x${string}`
) {
  const networkConfig = getNetworkConfig(NETWORK_ID);
  if (!networkConfig) {
    throw new Error(`Network ${NETWORK_ID} not configured`);
  }

  // Use refundable() helper to build escrow payment requirements
  return refundable(
    {
      scheme: 'escrow',
      network: NETWORK_ID,
      maxAmountRequired: PRICE_USDC,
      asset: networkConfig.usdc,
      payTo: merchantAddress,
    },
    operatorAddress
  );
}
