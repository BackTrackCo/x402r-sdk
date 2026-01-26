/**
 * X402rArbiter - Arbiter SDK for dispute resolution in X402r refundable payments
 * @module arbiter
 */

import type { PublicClient, WalletClient } from 'viem';
import {
  PaymentOperatorABI,
  RefundRequestABI,
  EscrowPeriodRecorderABI,
  RequestStatus,
  type PaymentInfo,
  type PaymentState,
} from '@x402r/core';

/**
 * Configuration for X402rArbiter
 */
export interface X402rArbiterConfig {
  /** viem PublicClient for reading contract state */
  publicClient: PublicClient;
  /** viem WalletClient for write operations */
  walletClient: WalletClient;
  /** PaymentOperator contract address */
  operatorAddress: `0x${string}`;
  /** Optional escrow contract address (defaults from network config) */
  escrowAddress?: `0x${string}`;
  /** Optional RefundRequest contract address (defaults from network config) */
  refundRequestAddress?: `0x${string}`;
  /** Chain ID for hash computation (default: 84532 for Base Sepolia) */
  chainId?: number;
}

/**
 * Arbiter SDK for dispute resolution in X402r refundable payments
 *
 * Provides methods for:
 * - Approving or denying refund requests
 * - Executing refunds for disputed payments
 * - Querying pending cases
 * - Batch operations for efficiency
 * - AI integration hooks for automated dispute resolution
 *
 * @example
 * ```typescript
 * import { X402rArbiter } from '@x402r/arbiter';
 * import { createPublicClient, createWalletClient, http } from 'viem';
 * import { baseSepolia } from 'viem/chains';
 * import { privateKeyToAccount } from 'viem/accounts';
 *
 * const account = privateKeyToAccount('0x...');
 *
 * const publicClient = createPublicClient({
 *   chain: baseSepolia,
 *   transport: http(),
 * });
 *
 * const walletClient = createWalletClient({
 *   account,
 *   chain: baseSepolia,
 *   transport: http(),
 * });
 *
 * const arbiter = new X402rArbiter({
 *   publicClient,
 *   walletClient,
 *   operatorAddress: '0x...',
 *   refundRequestAddress: '0x...',
 * });
 *
 * // Approve a refund request
 * const { txHash } = await arbiter.approveRefund(paymentInfo);
 * ```
 */
export class X402rArbiter {
  /** viem PublicClient for reading contract state */
  readonly publicClient: PublicClient;
  /** viem WalletClient for write operations */
  readonly walletClient: WalletClient;
  /** PaymentOperator contract address */
  readonly operatorAddress: `0x${string}`;
  /** Escrow contract address */
  readonly escrowAddress?: `0x${string}`;
  /** RefundRequest contract address */
  readonly refundRequestAddress?: `0x${string}`;
  /** Chain ID */
  readonly chainId: number;

  constructor(config: X402rArbiterConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.operatorAddress = config.operatorAddress;
    this.escrowAddress = config.escrowAddress;
    this.refundRequestAddress = config.refundRequestAddress;
    this.chainId = config.chainId ?? 84532;
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
   * const state = await arbiter.getPaymentState(paymentInfo);
   * if (state === PaymentState.InEscrow) {
   *   console.log('Payment is in escrow, can be refunded');
   * }
   * ```
   */
  async getPaymentState(paymentInfo: PaymentInfo): Promise<PaymentState> {
    const state = await this.publicClient.readContract({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'getPaymentState',
      args: [paymentInfo as never],
    });

    return state as PaymentState;
  }

  /**
   * Check if a refund request exists for a payment
   *
   * @param paymentInfo - The payment information struct
   * @returns True if a refund request exists
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const hasRequest = await arbiter.hasRefundRequest(paymentInfo);
   * if (hasRequest) {
   *   console.log('Refund request exists');
   * }
   * ```
   */
  async hasRefundRequest(paymentInfo: PaymentInfo): Promise<boolean> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const exists = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'hasRefundRequest',
      args: [paymentInfo as never],
    });

    return exists as boolean;
  }

  // ============ Decision Submission ============

  /**
   * Approve a refund request as the arbiter
   *
   * @param paymentInfo - The payment information struct
   * @returns Transaction hash
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await arbiter.approveRefund(paymentInfo);
   * console.log(`Refund approved: ${txHash}`);
   * ```
   */
  async approveRefund(paymentInfo: PaymentInfo): Promise<{ txHash: `0x${string}` }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'updateStatus',
      args: [paymentInfo as never, RequestStatus.Approved],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Deny a refund request as the arbiter
   *
   * @param paymentInfo - The payment information struct
   * @returns Transaction hash
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await arbiter.denyRefund(paymentInfo);
   * console.log(`Refund denied: ${txHash}`);
   * ```
   */
  async denyRefund(paymentInfo: PaymentInfo): Promise<{ txHash: `0x${string}` }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'updateStatus',
      args: [paymentInfo as never, RequestStatus.Denied],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Execute a refund for a payment in escrow
   *
   * This is typically called after approving a refund request to actually
   * transfer the funds back to the payer.
   *
   * @param paymentInfo - The payment information struct
   * @param amount - Amount to refund (defaults to maxAmount)
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * // Refund full amount
   * const { txHash } = await arbiter.executeRefundInEscrow(paymentInfo);
   *
   * // Refund partial amount
   * const { txHash } = await arbiter.executeRefundInEscrow(paymentInfo, BigInt('500000'));
   * ```
   */
  async executeRefundInEscrow(
    paymentInfo: PaymentInfo,
    amount?: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    const refundAmount = amount ?? paymentInfo.maxAmount;

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'refundInEscrow',
      args: [paymentInfo as never, refundAmount],
    });

    return { txHash: txHash as `0x${string}` };
  }

  // ============ Batch Operations ============

  /**
   * Approve multiple refund requests in batch
   *
   * @param paymentInfos - Array of payment information structs
   * @returns Array of transaction results
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const results = await arbiter.batchApprove([paymentInfo1, paymentInfo2, paymentInfo3]);
   * for (const { txHash } of results) {
   *   console.log(`Approved: ${txHash}`);
   * }
   * ```
   */
  async batchApprove(paymentInfos: PaymentInfo[]): Promise<{ txHash: `0x${string}` }[]> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    if (paymentInfos.length === 0) {
      return [];
    }

    const results: { txHash: `0x${string}` }[] = [];

    for (const paymentInfo of paymentInfos) {
      const result = await this.approveRefund(paymentInfo);
      results.push(result);
    }

    return results;
  }

  /**
   * Deny multiple refund requests in batch
   *
   * @param paymentInfos - Array of payment information structs
   * @returns Array of transaction results
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const results = await arbiter.batchDeny([paymentInfo1, paymentInfo2]);
   * for (const { txHash } of results) {
   *   console.log(`Denied: ${txHash}`);
   * }
   * ```
   */
  async batchDeny(paymentInfos: PaymentInfo[]): Promise<{ txHash: `0x${string}` }[]> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    if (paymentInfos.length === 0) {
      return [];
    }

    const results: { txHash: `0x${string}` }[] = [];

    for (const paymentInfo of paymentInfos) {
      const result = await this.denyRefund(paymentInfo);
      results.push(result);
    }

    return results;
  }

  // ============ Case Queries ============

  /**
   * Get all pending refund requests for a receiver that the arbiter can decide on
   *
   * @param receiverAddress - The receiver address to query (defaults to wallet account)
   * @returns Array of payment info hashes with pending refund requests
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const hashes = await arbiter.getPendingCases('0x...');
   * console.log(`${hashes.length} pending cases to review`);
   * ```
   */
  async getPendingCases(receiverAddress?: `0x${string}`): Promise<readonly `0x${string}`[]> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const address = receiverAddress ?? this.walletClient.account!.address;

    const hashes = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getReceiverRefundRequestHashes',
      args: [address],
    });

    return hashes as readonly `0x${string}`[];
  }

  /**
   * Get the status of a refund request
   *
   * @param paymentInfo - The payment information struct
   * @returns The refund request status (Pending, Approved, Denied, Cancelled)
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const status = await arbiter.getRefundStatus(paymentInfo);
   * if (status === RequestStatus.Pending) {
   *   console.log('Case needs review');
   * }
   * ```
   */
  async getRefundStatus(paymentInfo: PaymentInfo): Promise<typeof RequestStatus[keyof typeof RequestStatus]> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const status = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getRefundRequestStatus',
      args: [paymentInfo as never],
    });

    return status as typeof RequestStatus[keyof typeof RequestStatus];
  }

  /**
   * Get all refund request hashes for a receiver
   *
   * @param receiverAddress - The receiver address to query (defaults to wallet account)
   * @returns Object with hashes array
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { hashes } = await arbiter.getArbiterPayments('0x...');
   * console.log(`Found ${hashes.length} refund requests`);
   * ```
   */
  async getArbiterPayments(receiverAddress?: `0x${string}`): Promise<{ hashes: readonly `0x${string}`[] }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const address = receiverAddress ?? this.walletClient.account!.address;

    const hashes = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getReceiverRefundRequestHashes',
      args: [address],
    });

    return { hashes: hashes as readonly `0x${string}`[] };
  }

  // ============ Subscriptions ============

  /**
   * Watch for new refund requests (new cases to review)
   *
   * @param callback - Function to call when a new refund request is created
   * @returns Object with unsubscribe function
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { unsubscribe } = arbiter.watchNewCases((event) => {
   *   console.log('New case:', event);
   * });
   *
   * // Later: stop watching
   * unsubscribe();
   * ```
   */
  watchNewCases(callback: (event: unknown) => void): { unsubscribe: () => void } {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: 'RefundRequested',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });

    return { unsubscribe };
  }

  /**
   * Watch for refund request status updates (decisions made)
   *
   * @param callback - Function to call when a decision is made
   * @returns Object with unsubscribe function
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { unsubscribe } = arbiter.watchDecisions((event) => {
   *   console.log('Decision made:', event);
   * });
   *
   * // Later: stop watching
   * unsubscribe();
   * ```
   */
  watchDecisions(callback: (event: unknown) => void): { unsubscribe: () => void } {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: 'RefundRequestStatusUpdated',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });

    return { unsubscribe };
  }

  /**
   * Watch for freeze/unfreeze events on an escrow recorder
   *
   * @param escrowRecorderAddress - The EscrowPeriodRecorder contract address
   * @param callback - Function to call when a freeze event is received
   * @returns Object with unsubscribe function
   *
   * @example
   * ```typescript
   * const { unsubscribe } = arbiter.watchFreezeEvents(escrowRecorderAddress, (event) => {
   *   console.log('Freeze event:', event);
   * });
   *
   * // Later: stop watching
   * unsubscribe();
   * ```
   */
  watchFreezeEvents(
    escrowRecorderAddress: `0x${string}`,
    callback: (event: unknown) => void
  ): { unsubscribe: () => void } {
    const unsubscribeFrozen = this.publicClient.watchContractEvent({
      address: escrowRecorderAddress,
      abi: EscrowPeriodRecorderABI,
      eventName: 'PaymentFrozen',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });

    const unsubscribeUnfrozen = this.publicClient.watchContractEvent({
      address: escrowRecorderAddress,
      abi: EscrowPeriodRecorderABI,
      eventName: 'PaymentUnfrozen',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });

    return {
      unsubscribe: () => {
        unsubscribeFrozen();
        unsubscribeUnfrozen();
      },
    };
  }
}
