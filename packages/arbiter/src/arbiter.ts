/**
 * X402rArbiter - Arbiter SDK for dispute resolution in X402r refundable payments
 * @module arbiter
 */

import type { PublicClient, WalletClient } from 'viem';
import {
  PaymentOperatorABI,
  RefundRequestABI,
  FreezeABI,
  RequestStatus,
  NotImplementedError,
  type PaymentInfo,
  type PaymentState,
  type RefundRequestData,
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
  // NOTE: getPaymentState is stubbed for future Graph/indexer integration.

  /**
   * Get the current state of a payment
   *
   * @param _paymentInfo - The payment information struct
   * @returns The payment state (NonExistent, InEscrow, Released, Settled, Expired)
   * @throws NotImplementedError - This method requires subgraph integration
   *
   * @example
   * ```typescript
   * const state = await arbiter.getPaymentState(paymentInfo);
   * if (state === PaymentState.InEscrow) {
   *   console.log('Payment is in escrow, can be refunded');
   * }
   * ```
   */
  async getPaymentState(_paymentInfo: PaymentInfo): Promise<PaymentState> {
    throw new NotImplementedError('getPaymentState');
  }

  /**
   * Check if a refund request exists for a payment
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns True if a refund request exists
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const hasRequest = await arbiter.hasRefundRequest(paymentInfo, 0n);
   * if (hasRequest) {
   *   console.log('Refund request exists');
   * }
   * ```
   */
  async hasRefundRequest(paymentInfo: PaymentInfo, nonce: bigint): Promise<boolean> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const exists = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'hasRefundRequest',
      args: [paymentInfo as never, nonce],
    });

    return exists as boolean;
  }

  /**
   * Get the full refund request data
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns The full refund request data including amount and status
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const request = await arbiter.getRefundRequest(paymentInfo, 0n);
   * console.log(`Requesting ${request.amount} refund, status: ${request.status}`);
   * ```
   */
  async getRefundRequest(paymentInfo: PaymentInfo, nonce: bigint): Promise<RefundRequestData> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const request = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getRefundRequest',
      args: [paymentInfo as never, nonce],
    });

    return request as unknown as RefundRequestData;
  }

  // ============ Decision Submission ============

  /**
   * Approve a refund request as the arbiter
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns Transaction hash
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await arbiter.approveRefund(paymentInfo, 0n);
   * console.log(`Refund approved: ${txHash}`);
   * ```
   */
  async approveRefund(
    paymentInfo: PaymentInfo,
    nonce: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'updateStatus',
      args: [paymentInfo as never, nonce, RequestStatus.Approved],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Deny a refund request as the arbiter
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns Transaction hash
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await arbiter.denyRefund(paymentInfo, 0n);
   * console.log(`Refund denied: ${txHash}`);
   * ```
   */
  async denyRefund(
    paymentInfo: PaymentInfo,
    nonce: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'updateStatus',
      args: [paymentInfo as never, nonce, RequestStatus.Denied],
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
   * @param items - Array of objects containing paymentInfo and nonce
   * @returns Array of transaction results
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const results = await arbiter.batchApprove([
   *   { paymentInfo: paymentInfo1, nonce: 0n },
   *   { paymentInfo: paymentInfo2, nonce: 0n },
   * ]);
   * for (const { txHash } of results) {
   *   console.log(`Approved: ${txHash}`);
   * }
   * ```
   */
  async batchApprove(
    items: Array<{ paymentInfo: PaymentInfo; nonce: bigint }>
  ): Promise<{ txHash: `0x${string}` }[]> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    if (items.length === 0) {
      return [];
    }

    const results: { txHash: `0x${string}` }[] = [];

    for (const { paymentInfo, nonce } of items) {
      const result = await this.approveRefund(paymentInfo, nonce);
      results.push(result);
    }

    return results;
  }

  /**
   * Deny multiple refund requests in batch
   *
   * @param items - Array of objects containing paymentInfo and nonce
   * @returns Array of transaction results
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const results = await arbiter.batchDeny([
   *   { paymentInfo: paymentInfo1, nonce: 0n },
   *   { paymentInfo: paymentInfo2, nonce: 0n },
   * ]);
   * for (const { txHash } of results) {
   *   console.log(`Denied: ${txHash}`);
   * }
   * ```
   */
  async batchDeny(
    items: Array<{ paymentInfo: PaymentInfo; nonce: bigint }>
  ): Promise<{ txHash: `0x${string}` }[]> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    if (items.length === 0) {
      return [];
    }

    const results: { txHash: `0x${string}` }[] = [];

    for (const { paymentInfo, nonce } of items) {
      const result = await this.denyRefund(paymentInfo, nonce);
      results.push(result);
    }

    return results;
  }

  // ============ Case Queries ============

  /**
   * Get paginated refund request keys for a receiver that the arbiter can decide on
   *
   * @param offset - Starting index (0-based)
   * @param count - Number of keys to return
   * @param receiverAddress - The receiver address to query (defaults to wallet account)
   * @returns Object with keys array and total count
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { keys, total } = await arbiter.getPendingCases(0n, 10n, '0x...');
   * console.log(`${total} total cases, showing first ${keys.length}`);
   * ```
   */
  async getPendingCases(
    offset: bigint,
    count: bigint,
    receiverAddress?: `0x${string}`
  ): Promise<{ keys: readonly `0x${string}`[]; total: bigint }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const address = receiverAddress ?? this.walletClient.account!.address;

    const [keys, total] = (await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getReceiverRefundRequests',
      args: [address, offset, count],
    })) as [readonly `0x${string}`[], bigint];

    return { keys, total };
  }

  /**
   * Get the status of a refund request
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns The refund request status (Pending, Approved, Denied, Cancelled)
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const status = await arbiter.getRefundStatus(paymentInfo, 0n);
   * if (status === RequestStatus.Pending) {
   *   console.log('Case needs review');
   * }
   * ```
   */
  async getRefundStatus(
    paymentInfo: PaymentInfo,
    nonce: bigint
  ): Promise<typeof RequestStatus[keyof typeof RequestStatus]> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const status = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getRefundRequestStatus',
      args: [paymentInfo as never, nonce],
    });

    return status as typeof RequestStatus[keyof typeof RequestStatus];
  }

  /**
   * Get paginated refund request keys for a receiver
   *
   * @param offset - Starting index (0-based)
   * @param count - Number of keys to return
   * @param receiverAddress - The receiver address to query (defaults to wallet account)
   * @returns Object with keys array and total count
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { keys, total } = await arbiter.getArbiterPayments(0n, 10n, '0x...');
   * console.log(`Found ${total} refund requests, showing first ${keys.length}`);
   * ```
   */
  async getArbiterPayments(
    offset: bigint,
    count: bigint,
    receiverAddress?: `0x${string}`
  ): Promise<{ keys: readonly `0x${string}`[]; total: bigint }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const address = receiverAddress ?? this.walletClient.account!.address;

    const [keys, total] = (await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getReceiverRefundRequests',
      args: [address, offset, count],
    })) as [readonly `0x${string}`[], bigint];

    return { keys, total };
  }

  /**
   * Get the total count of refund requests for a receiver
   *
   * @param receiverAddress - The receiver address to query (defaults to wallet account)
   * @returns Total number of refund requests
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const count = await arbiter.getRefundRequestCount('0x...');
   * console.log(`Total refund requests: ${count}`);
   * ```
   */
  async getRefundRequestCount(receiverAddress?: `0x${string}`): Promise<bigint> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const address = receiverAddress ?? this.walletClient.account!.address;

    const count = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'receiverRefundRequestCount',
      args: [address],
    });

    return count as bigint;
  }

  /**
   * Get refund request data by composite key
   *
   * @param compositeKey - The keccak256(paymentInfoHash, nonce) key
   * @returns The refund request data
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const request = await arbiter.getRefundRequestByKey(compositeKey);
   * console.log(`Amount: ${request.amount}, Status: ${request.status}`);
   * ```
   */
  async getRefundRequestByKey(compositeKey: `0x${string}`): Promise<RefundRequestData> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const request = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getRefundRequestByKey',
      args: [compositeKey],
    });

    return request as unknown as RefundRequestData;
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
   * Watch for freeze/unfreeze events on a Freeze contract
   *
   * @param freezeAddress - The Freeze contract address
   * @param callback - Function to call when a freeze event is received
   * @returns Object with unsubscribe function
   *
   * @example
   * ```typescript
   * const { unsubscribe } = arbiter.watchFreezeEvents(freezeAddress, (event) => {
   *   console.log('Freeze event:', event);
   * });
   *
   * // Later: stop watching
   * unsubscribe();
   * ```
   */
  watchFreezeEvents(
    freezeAddress: `0x${string}`,
    callback: (event: unknown) => void
  ): { unsubscribe: () => void } {
    const unsubscribeFrozen = this.publicClient.watchContractEvent({
      address: freezeAddress,
      abi: FreezeABI,
      eventName: 'PaymentFrozen',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });

    const unsubscribeUnfrozen = this.publicClient.watchContractEvent({
      address: freezeAddress,
      abi: FreezeABI,
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
