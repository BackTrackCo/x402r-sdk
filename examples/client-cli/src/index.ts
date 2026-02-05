#!/usr/bin/env node

/**
 * x402r Client CLI
 *
 * A command-line tool for making x402r payments, freezing payments, and requesting refunds.
 *
 * Usage:
 *   pnpm start pay --url http://localhost:3000/weather
 *   pnpm start freeze --payment-json '{"operator":...}'
 *   pnpm start refund --payment-json '{"operator":...}' --amount 10000
 */

import { Command } from 'commander';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getNetworkConfig,
  calculateTotalFees,
  formatFeeBreakdown,
  validateFeeBounds,
  type PaymentInfo,
} from '@x402r/core';
import { pay } from './commands/pay.js';
import { freeze, unfreeze, checkFrozen } from './commands/freeze.js';
import { requestRefund, cancelRefund, getRefundStatus } from './commands/refund.js';
import { parsePaymentInfo } from '../../shared/utils.js';

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, '..', '.env') });

const NETWORK_ID = process.env.NETWORK_ID || 'eip155:84532';
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

// Create viem clients
function createClients() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);

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

// Create CLI
const program = new Command();

program
  .name('x402r-client')
  .description('CLI tool for x402r payments')
  .version('0.0.1');

// Pay command
program
  .command('pay')
  .description('Make a payment to a URL that returns 402')
  .requiredOption('-u, --url <url>', 'URL to pay for')
  .action(async (options) => {
    const { walletClient } = createClients();

    const result = await pay({
      url: options.url,
      walletClient,
    });

    if (result.success) {
      console.log('\n=== Response ===');
      console.log(JSON.stringify(result.response, null, 2));

      if (result.paymentInfo) {
        console.log('\n=== Payment Info (save for freeze/refund) ===');
        console.log(JSON.stringify(result.paymentInfo, (_, v) =>
          typeof v === 'bigint' ? v.toString() : v
        , 2));
      }

      if (result.transaction) {
        console.log('\n=== Transaction ===');
        console.log(`https://sepolia.basescan.org/tx/${result.transaction}`);
      }
    } else {
      console.error('\nPayment failed:', result.error);
      process.exit(1);
    }
  });

// Freeze command
program
  .command('freeze')
  .description('Freeze a payment to extend escrow period')
  .requiredOption('-p, --payment-json <json>', 'Payment info JSON')
  .requiredOption('-f, --freeze-address <address>', 'Freeze contract address')
  .requiredOption('-o, --operator-address <address>', 'Operator address')
  .action(async (options) => {
    const { publicClient, walletClient } = createClients();
    const paymentInfo = parsePaymentInfo(options.paymentJson);

    const result = await freeze({
      paymentInfo,
      freezeAddress: options.freezeAddress as `0x${string}`,
      operatorAddress: options.operatorAddress as `0x${string}`,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.error('\nFreeze failed:', result.error);
      process.exit(1);
    }
  });

// Unfreeze command
program
  .command('unfreeze')
  .description('Unfreeze a previously frozen payment')
  .requiredOption('-p, --payment-json <json>', 'Payment info JSON')
  .requiredOption('-f, --freeze-address <address>', 'Freeze contract address')
  .requiredOption('-o, --operator-address <address>', 'Operator address')
  .action(async (options) => {
    const { publicClient, walletClient } = createClients();
    const paymentInfo = parsePaymentInfo(options.paymentJson);

    const result = await unfreeze({
      paymentInfo,
      freezeAddress: options.freezeAddress as `0x${string}`,
      operatorAddress: options.operatorAddress as `0x${string}`,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.error('\nUnfreeze failed:', result.error);
      process.exit(1);
    }
  });

// Check frozen status command
program
  .command('is-frozen')
  .description('Check if a payment is frozen')
  .requiredOption('-p, --payment-json <json>', 'Payment info JSON')
  .requiredOption('-f, --freeze-address <address>', 'Freeze contract address')
  .requiredOption('-o, --operator-address <address>', 'Operator address')
  .action(async (options) => {
    const { publicClient } = createClients();
    const paymentInfo = parsePaymentInfo(options.paymentJson);

    const isFrozen = await checkFrozen({
      paymentInfo,
      freezeAddress: options.freezeAddress as `0x${string}`,
      operatorAddress: options.operatorAddress as `0x${string}`,
      publicClient,
    });

    console.log(`\nPayment is ${isFrozen ? 'FROZEN' : 'NOT FROZEN'}`);
  });

// Refund command
program
  .command('refund')
  .description('Request a refund for a payment')
  .requiredOption('-p, --payment-json <json>', 'Payment info JSON')
  .requiredOption('-a, --amount <amount>', 'Amount to refund (in token units)')
  .requiredOption('-o, --operator-address <address>', 'Operator address')
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { publicClient, walletClient } = createClients();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
    const networkConfig = getNetworkConfig(NETWORK_ID)!;

    const result = await requestRefund({
      paymentInfo,
      amount: BigInt(options.amount),
      nonce: BigInt(options.nonce),
      operatorAddress: options.operatorAddress as `0x${string}`,
      refundRequestAddress: networkConfig.refundRequest,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
      if (result.status !== undefined) {
        console.log('\nCurrent status:', result.status);
      }
    } else {
      console.error('\nRefund request failed:', result.error);
      process.exit(1);
    }
  });

// Cancel refund command
program
  .command('cancel-refund')
  .description('Cancel a pending refund request')
  .requiredOption('-p, --payment-json <json>', 'Payment info JSON')
  .requiredOption('-o, --operator-address <address>', 'Operator address')
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { publicClient, walletClient } = createClients();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
    const networkConfig = getNetworkConfig(NETWORK_ID)!;

    const result = await cancelRefund({
      paymentInfo,
      nonce: BigInt(options.nonce),
      operatorAddress: options.operatorAddress as `0x${string}`,
      refundRequestAddress: networkConfig.refundRequest,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.error('\nCancel refund failed:', result.error);
      process.exit(1);
    }
  });

// Refund status command
program
  .command('refund-status')
  .description('Check the status of a refund request')
  .requiredOption('-p, --payment-json <json>', 'Payment info JSON')
  .requiredOption('-o, --operator-address <address>', 'Operator address')
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { publicClient } = createClients();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
    const networkConfig = getNetworkConfig(NETWORK_ID)!;

    const status = await getRefundStatus({
      paymentInfo,
      nonce: BigInt(options.nonce),
      operatorAddress: options.operatorAddress as `0x${string}`,
      refundRequestAddress: networkConfig.refundRequest,
      publicClient,
    });

    if (status === null) {
      console.log('\nNo refund request found for this payment');
    } else {
      const statusNames = ['Pending', 'Approved', 'Denied', 'Cancelled'];
      console.log(`\nRefund status: ${statusNames[status] || status}`);
    }
  });

// Info command
program
  .command('info')
  .description('Show configuration info')
  .action(() => {
    const { account } = createClients();
    const networkConfig = getNetworkConfig(NETWORK_ID)!;

    console.log('\n=== Client Info ===');
    console.log('  Address:', account.address);
    console.log('  Network:', NETWORK_ID);
    console.log('  RPC:', RPC_URL);

    console.log('\n=== Protocol Addresses ===');
    console.log('  Escrow:', networkConfig.authCaptureEscrow);
    console.log('  RefundRequest:', networkConfig.refundRequest);
    console.log('  TokenCollector:', networkConfig.tokenCollector);
    console.log('  USDC:', networkConfig.usdc);
  });

// Preview fee command
program
  .command('preview-fee')
  .description('Preview fees for a payment before authorizing')
  .requiredOption('-o, --operator-address <address>', 'Operator address')
  .requiredOption('-a, --amount <amount>', 'Amount to calculate fees for (in token units)')
  .option('-p, --payment-json <json>', 'Payment info JSON (optional, for bounds validation)')
  .action(async (options) => {
    const { publicClient, account } = createClients();
    const operatorAddress = options.operatorAddress as `0x${string}`;
    const amount = BigInt(options.amount);
    const networkConfig = getNetworkConfig(NETWORK_ID)!;

    // Create a minimal payment info for fee calculation if not provided
    const paymentInfo: PaymentInfo = options.paymentJson
      ? parsePaymentInfo(options.paymentJson)
      : {
          operator: operatorAddress,
          payer: account.address,
          receiver: '0x0000000000000000000000000000000000000001',
          token: networkConfig.usdc,
          maxAmount: amount,
          preApprovalExpiry: 0n,
          authorizationExpiry: 0n,
          refundExpiry: 0n,
          minFeeBps: 0,
          maxFeeBps: 10000, // 100%
          feeReceiver: '0x0000000000000000000000000000000000000001',
          salt: 0n,
        };

    console.log('\nPreviewing fees...');
    console.log('  Amount:', amount.toString());
    console.log('  Operator:', operatorAddress);
    console.log('  Payer:', account.address);

    try {
      const fees = await calculateTotalFees(
        publicClient,
        operatorAddress,
        paymentInfo,
        amount,
        account.address
      );

      console.log('\n' + formatFeeBreakdown(fees));

      // Validate bounds if payment info was provided
      if (options.paymentJson) {
        const isValid = validateFeeBounds(fees, paymentInfo);
        console.log(
          `\nFee Bounds: ${isValid ? 'VALID' : 'INVALID'} (min: ${paymentInfo.minFeeBps} bps, max: ${paymentInfo.maxFeeBps} bps)`
        );
        if (!isValid) {
          console.log('WARNING: Fees are outside the acceptable bounds for this payment!');
        }
      }
    } catch (error) {
      console.error('\nFailed to preview fees:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
