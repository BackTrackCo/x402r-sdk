/**
 * X402rClient - Client SDK for payers using X402r refundable payments
 * @module client
 */

import type { PublicClient, WalletClient } from 'viem';
import { PaymentOperatorABI, type PaymentInfo, type PaymentState } from '@x402r/core';

/**
 * Configuration for X402rClient
 */
export interface X402rClientConfig {
  /** viem PublicClient for reading contract state */
  publicClient: PublicClient;
  /** Optional viem WalletClient for write operations */
  walletClient?: WalletClient;
  /** PaymentOperator contract address */
  operatorAddress: `0x${string}`;
  /** Optional escrow contract address (defaults from network config) */
  escrowAddress?: `0x${string}`;
  /** Optional RefundRequest contract address (defaults from network config) */
  refundRequestAddress?: `0x${string}`;
}

/**
 * Client SDK for payers using X402r refundable payments
 *
 * Provides methods for:
 * - Querying payment state and details
 * - Requesting and managing refunds
 * - Freezing payments during escrow period
 * - Subscribing to payment events
 *
 * @example
 * ```typescript
 * import { X402rClient } from '@x402r/client';
 * import { createPublicClient, http } from 'viem';
 * import { baseSepolia } from 'viem/chains';
 *
 * const publicClient = createPublicClient({
 *   chain: baseSepolia,
 *   transport: http(),
 * });
 *
 * const client = new X402rClient({
 *   publicClient,
 *   operatorAddress: '0x...',
 * });
 *
 * const state = await client.getPaymentState(paymentInfo);
 * ```
 */
export class X402rClient {
  /** viem PublicClient for reading contract state */
  readonly publicClient: PublicClient;
  /** Optional viem WalletClient for write operations */
  readonly walletClient?: WalletClient;
  /** PaymentOperator contract address */
  readonly operatorAddress: `0x${string}`;
  /** Escrow contract address */
  readonly escrowAddress?: `0x${string}`;
  /** RefundRequest contract address */
  readonly refundRequestAddress?: `0x${string}`;

  constructor(config: X402rClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.operatorAddress = config.operatorAddress;
    this.escrowAddress = config.escrowAddress;
    this.refundRequestAddress = config.refundRequestAddress;
  }

  // ============ Payment Queries ============

  /**
   * Get the current state of a payment
   *
   * @param paymentInfo - The payment information struct
   * @returns The payment state (NonExistent, InEscrow, Released, Settled, Expired)
   *
   * @example
   * ```typescript
   * const state = await client.getPaymentState(paymentInfo);
   * if (state === PaymentState.InEscrow) {
   *   console.log('Payment is in escrow');
   * }
   * ```
   */
  async getPaymentState(paymentInfo: PaymentInfo): Promise<PaymentState> {
    const state = await this.publicClient.readContract({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'getPaymentState',
      args: [paymentInfo],
    });

    return state as PaymentState;
  }

  /**
   * Check if a payment exists (has been authorized)
   *
   * @param paymentInfoHash - The hash of the PaymentInfo
   * @returns True if payment exists
   *
   * @example
   * ```typescript
   * const exists = await client.paymentExists(paymentInfoHash);
   * ```
   */
  async paymentExists(paymentInfoHash: `0x${string}`): Promise<boolean> {
    const exists = await this.publicClient.readContract({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'paymentExists',
      args: [paymentInfoHash],
    });

    return exists as boolean;
  }

  /**
   * Check if a payment is currently in escrow
   *
   * @param paymentInfoHash - The hash of the PaymentInfo
   * @returns True if payment is in escrow (has capturable amount)
   *
   * @example
   * ```typescript
   * if (await client.isInEscrow(paymentInfoHash)) {
   *   console.log('Can still be refunded');
   * }
   * ```
   */
  async isInEscrow(paymentInfoHash: `0x${string}`): Promise<boolean> {
    const inEscrow = await this.publicClient.readContract({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'isInEscrow',
      args: [paymentInfoHash],
    });

    return inEscrow as boolean;
  }

  /**
   * Get stored PaymentInfo for a given hash
   *
   * @param paymentInfoHash - The hash of the PaymentInfo
   * @returns The stored PaymentInfo struct
   *
   * @example
   * ```typescript
   * const details = await client.getPaymentDetails(paymentInfoHash);
   * console.log(`Receiver: ${details.receiver}`);
   * ```
   */
  async getPaymentDetails(paymentInfoHash: `0x${string}`): Promise<PaymentInfo> {
    const paymentInfo = await this.publicClient.readContract({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'getPaymentInfo',
      args: [paymentInfoHash],
    });

    return paymentInfo as PaymentInfo;
  }

  /**
   * Get all payment hashes where the current wallet is the payer
   *
   * @returns Object with hashes array
   * @throws Error if walletClient is not configured
   *
   * @example
   * ```typescript
   * const { hashes } = await client.getMyPayments();
   * for (const hash of hashes) {
   *   const details = await client.getPaymentDetails(hash);
   *   console.log(`Payment to ${details.receiver}`);
   * }
   * ```
   */
  async getMyPayments(): Promise<{ hashes: readonly `0x${string}`[] }> {
    if (!this.walletClient?.account) {
      throw new Error('WalletClient required for getMyPayments');
    }

    const payerAddress = this.walletClient.account.address;

    const hashes = await this.publicClient.readContract({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'getPayerPayments',
      args: [payerAddress],
    });

    return { hashes: hashes as readonly `0x${string}`[] };
  }
}
