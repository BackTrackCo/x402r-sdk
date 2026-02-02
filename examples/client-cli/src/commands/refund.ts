/**
 * Refund Command
 * Requests a refund for a payment
 */

import { X402rClient } from '@x402r/client';
import type { PaymentInfo } from '@x402r/core';
import type { PublicClient, WalletClient } from 'viem';

type RequestStatus = number;

export interface RefundOptions {
  paymentInfo: PaymentInfo;
  amount: bigint;
  nonce: bigint;
  operatorAddress: `0x${string}`;
  refundRequestAddress: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export interface RefundResult {
  success: boolean;
  txHash?: `0x${string}`;
  status?: RequestStatus;
  error?: string;
}

/**
 * Request a refund for a payment
 */
export async function requestRefund(options: RefundOptions): Promise<RefundResult> {
  const {
    paymentInfo,
    amount,
    nonce,
    operatorAddress,
    refundRequestAddress,
    publicClient,
    walletClient,
  } = options;

  console.log('\nRequesting refund...');
  console.log('  Operator:', operatorAddress);
  console.log('  RefundRequest:', refundRequestAddress);
  console.log('  Amount:', amount.toString(), 'units');
  console.log('  Nonce:', nonce.toString());

  // Create client
  const client = new X402rClient({
    publicClient,
    walletClient,
    operatorAddress,
    refundRequestAddress,
  });

  // Check if refund request already exists
  const hasRequest = await client.hasRefundRequest(paymentInfo, nonce);
  if (hasRequest) {
    const status = await client.getRefundStatus(paymentInfo, nonce);
    console.log('\nRefund request already exists');
    console.log('  Status:', status);
    return {
      success: true,
      status,
    };
  }

  try {
    // Submit refund request
    const { txHash } = await client.requestRefund(paymentInfo, amount, nonce);
    console.log('\nRefund requested!');
    console.log('  Transaction:', txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('\nRefund request failed:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Cancel a pending refund request
 */
export async function cancelRefund(
  options: Omit<RefundOptions, 'amount'>
): Promise<RefundResult> {
  const {
    paymentInfo,
    nonce,
    operatorAddress,
    refundRequestAddress,
    publicClient,
    walletClient,
  } = options;

  console.log('\nCancelling refund request...');

  // Create client
  const client = new X402rClient({
    publicClient,
    walletClient,
    operatorAddress,
    refundRequestAddress,
  });

  // Check if refund request exists
  const hasRequest = await client.hasRefundRequest(paymentInfo, nonce);
  if (!hasRequest) {
    console.log('\nNo refund request exists for this payment');
    return {
      success: true,
    };
  }

  try {
    // Cancel refund request
    const { txHash } = await client.cancelRefundRequest(paymentInfo, nonce);
    console.log('\nRefund request cancelled!');
    console.log('  Transaction:', txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('\nCancel refund failed:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get refund request status
 */
export async function getRefundStatus(
  options: Omit<RefundOptions, 'amount' | 'walletClient'>
): Promise<RequestStatus | null> {
  const { paymentInfo, nonce, operatorAddress, refundRequestAddress, publicClient } = options;

  const client = new X402rClient({
    publicClient,
    operatorAddress,
    refundRequestAddress,
  });

  const hasRequest = await client.hasRefundRequest(paymentInfo, nonce);
  if (!hasRequest) {
    return null;
  }

  return client.getRefundStatus(paymentInfo, nonce);
}
