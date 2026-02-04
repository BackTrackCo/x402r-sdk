/**
 * X402rClient - Client SDK for payers using X402r refundable payments
 * @module client
 */

import type { PublicClient, WalletClient } from 'viem';
import {
  PaymentOperatorABI,
  RefundRequestABI,
  EscrowPeriodABI,
  FreezeABI,
  NotImplementedError,
  type PaymentInfo,
  type PaymentState,
  type RequestStatus,
  type RefundRequestData,
} from '@x402r/core';

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
  // NOTE: These methods are stubbed for future Graph/indexer integration.
  // The PaymentOperator contract does not store payment state on-chain.
  // Payment state is derived from the escrow contract and event logs.

  /**
   * Get the current state of a payment
   *
   * @param _paymentInfo - The payment information struct
   * @returns The payment state (NonExistent, InEscrow, Released, Settled, Expired)
   * @throws NotImplementedError - This method requires subgraph integration
   *
   * @example
   * ```typescript
   * const state = await client.getPaymentState(paymentInfo);
   * if (state === PaymentState.InEscrow) {
   *   console.log('Payment is in escrow');
   * }
   * ```
   */
  async getPaymentState(_paymentInfo: PaymentInfo): Promise<PaymentState> {
    throw new NotImplementedError('getPaymentState');
  }

  /**
   * Check if a payment exists (has been authorized)
   *
   * @param _paymentInfoHash - The hash of the PaymentInfo
   * @returns True if payment exists
   * @throws NotImplementedError - This method requires subgraph integration
   *
   * @example
   * ```typescript
   * const exists = await client.paymentExists(paymentInfoHash);
   * ```
   */
  async paymentExists(_paymentInfoHash: `0x${string}`): Promise<boolean> {
    throw new NotImplementedError('paymentExists');
  }

  /**
   * Check if a payment is currently in escrow
   *
   * @param _paymentInfoHash - The hash of the PaymentInfo
   * @returns True if payment is in escrow (has capturable amount)
   * @throws NotImplementedError - This method requires subgraph integration
   *
   * @example
   * ```typescript
   * if (await client.isInEscrow(paymentInfoHash)) {
   *   console.log('Can still be refunded');
   * }
   * ```
   */
  async isInEscrow(_paymentInfoHash: `0x${string}`): Promise<boolean> {
    throw new NotImplementedError('isInEscrow');
  }

  /**
   * Get stored PaymentInfo for a given hash
   *
   * @param _paymentInfoHash - The hash of the PaymentInfo
   * @returns The stored PaymentInfo struct
   * @throws NotImplementedError - This method requires subgraph integration
   *
   * @example
   * ```typescript
   * const details = await client.getPaymentDetails(paymentInfoHash);
   * console.log(`Receiver: ${details.receiver}`);
   * ```
   */
  async getPaymentDetails(_paymentInfoHash: `0x${string}`): Promise<PaymentInfo> {
    throw new NotImplementedError('getPaymentDetails');
  }

  /**
   * Get all payment hashes where the current wallet is the payer
   *
   * @returns Object with hashes array
   * @throws NotImplementedError - This method requires subgraph integration
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
    throw new NotImplementedError('getMyPayments');
  }

  // ============ Refund Operations ============

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
   * const hasRequest = await client.hasRefundRequest(paymentInfo, 0n);
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
   * Get the status of a refund request
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns The refund request status (Pending, Approved, Denied, Cancelled)
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const status = await client.getRefundStatus(paymentInfo, 0n);
   * if (status === RequestStatus.Pending) {
   *   console.log('Refund request is pending');
   * }
   * ```
   */
  async getRefundStatus(paymentInfo: PaymentInfo, nonce: bigint): Promise<RequestStatus> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const status = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getRefundRequestStatus',
      args: [paymentInfo as never, nonce],
    });

    return status as RequestStatus;
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
   * const request = await client.getRefundRequest(paymentInfo, 0n);
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

  /**
   * Submit a refund request for a payment
   *
   * @param paymentInfo - The payment information struct
   * @param amount - The amount to request for refund
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.requestRefund(paymentInfo, BigInt('1000000'), 0n);
   * console.log(`Refund requested: ${txHash}`);
   * ```
   */
  async requestRefund(
    paymentInfo: PaymentInfo,
    amount: bigint,
    nonce: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.walletClient) {
      throw new Error('WalletClient required');
    }

    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'requestRefund',
      args: [paymentInfo as never, amount, nonce],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Cancel a pending refund request
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.cancelRefundRequest(paymentInfo, 0n);
   * console.log(`Refund request cancelled: ${txHash}`);
   * ```
   */
  async cancelRefundRequest(
    paymentInfo: PaymentInfo,
    nonce: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.walletClient) {
      throw new Error('WalletClient required');
    }

    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'cancelRefundRequest',
      args: [paymentInfo as never, nonce],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Get paginated refund request keys for the current wallet
   *
   * @param offset - Starting index (0-based)
   * @param count - Number of keys to return
   * @returns Object with keys array and total count
   * @throws Error if walletClient is not configured
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { keys, total } = await client.getMyRefundRequests(0n, 10n);
   * console.log(`Found ${total} refund requests, showing first ${keys.length}`);
   * ```
   */
  async getMyRefundRequests(
    offset: bigint,
    count: bigint
  ): Promise<{ keys: readonly `0x${string}`[]; total: bigint }> {
    if (!this.walletClient?.account) {
      throw new Error('WalletClient required');
    }

    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const payerAddress = this.walletClient.account.address;

    const [keys, total] = (await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getPayerRefundRequests',
      args: [payerAddress, offset, count],
    })) as [readonly `0x${string}`[], bigint];

    return { keys, total };
  }

  /**
   * Get the total count of refund requests for the current wallet
   *
   * @returns Total number of refund requests
   * @throws Error if walletClient is not configured
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const count = await client.getMyRefundRequestCount();
   * console.log(`Total refund requests: ${count}`);
   * ```
   */
  async getMyRefundRequestCount(): Promise<bigint> {
    if (!this.walletClient?.account) {
      throw new Error('WalletClient required');
    }

    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const payerAddress = this.walletClient.account.address;

    const count = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'payerRefundRequestCount',
      args: [payerAddress],
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
   * const request = await client.getRefundRequestByKey(compositeKey);
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

  // ============ Freeze Operations ============

  /**
   * Freeze a payment to extend the escrow period
   *
   * @param paymentInfo - The payment information struct
   * @param freezeAddress - The Freeze contract address
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.freezePayment(paymentInfo, freezeAddress);
   * console.log(`Payment frozen: ${txHash}`);
   * ```
   */
  async freezePayment(
    paymentInfo: PaymentInfo,
    freezeAddress: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.walletClient) {
      throw new Error('WalletClient required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: freezeAddress,
      abi: FreezeABI,
      functionName: 'freeze',
      args: [paymentInfo as never],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Unfreeze a payment that was previously frozen
   *
   * @param paymentInfo - The payment information struct
   * @param freezeAddress - The Freeze contract address
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.unfreezePayment(paymentInfo, freezeAddress);
   * console.log(`Payment unfrozen: ${txHash}`);
   * ```
   */
  async unfreezePayment(
    paymentInfo: PaymentInfo,
    freezeAddress: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.walletClient) {
      throw new Error('WalletClient required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: freezeAddress,
      abi: FreezeABI,
      functionName: 'unfreeze',
      args: [paymentInfo as never],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Check if a payment is currently frozen
   *
   * @param paymentInfo - The payment information struct
   * @param freezeAddress - The Freeze contract address
   * @returns True if payment is frozen
   *
   * @example
   * ```typescript
   * if (await client.isFrozen(paymentInfo, freezeAddress)) {
   *   console.log('Payment is frozen');
   * }
   * ```
   */
  async isFrozen(
    paymentInfo: PaymentInfo,
    freezeAddress: `0x${string}`
  ): Promise<boolean> {
    const frozen = await this.publicClient.readContract({
      address: freezeAddress,
      abi: FreezeABI,
      functionName: 'isFrozen',
      args: [paymentInfo as never],
    });

    return frozen as boolean;
  }

  // ============ Escrow Period Operations ============

  /**
   * Get the authorization time for a payment
   *
   * @param paymentInfo - The payment information struct
   * @param escrowPeriodAddress - The EscrowPeriod contract address
   * @returns The timestamp when the payment was authorized
   *
   * @example
   * ```typescript
   * const authTime = await client.getAuthorizationTime(paymentInfo, escrowPeriodAddress);
   * console.log(`Authorized at: ${new Date(Number(authTime) * 1000)}`);
   * ```
   */
  async getAuthorizationTime(
    paymentInfo: PaymentInfo,
    escrowPeriodAddress: `0x${string}`
  ): Promise<bigint> {
    const authTime = await this.publicClient.readContract({
      address: escrowPeriodAddress,
      abi: EscrowPeriodABI,
      functionName: 'getAuthorizationTime',
      args: [paymentInfo as never],
    });

    return authTime as bigint;
  }

  /**
   * Check if a payment is currently within its escrow period
   *
   * @param paymentInfo - The payment information struct
   * @param escrowPeriodAddress - The EscrowPeriod contract address
   * @returns True if payment is still within escrow period, false if it has passed
   *
   * @example
   * ```typescript
   * const inEscrow = await client.isDuringEscrowPeriod(paymentInfo, escrowPeriodAddress);
   * if (!inEscrow) {
   *   console.log('Escrow period has passed - funds can be released');
   * }
   * ```
   */
  async isDuringEscrowPeriod(
    paymentInfo: PaymentInfo,
    escrowPeriodAddress: `0x${string}`
  ): Promise<boolean> {
    const inEscrow = await this.publicClient.readContract({
      address: escrowPeriodAddress,
      abi: EscrowPeriodABI,
      functionName: 'isDuringEscrowPeriod',
      args: [paymentInfo as never],
    });

    return inEscrow as boolean;
  }

  // ============ Subscriptions ============

  /**
   * Watch for payment state changes (releases and refunds)
   *
   * @param _paymentInfoHash - The hash of the PaymentInfo to watch
   * @param callback - Callback function called when state changes
   * @returns Object with unsubscribe function
   *
   * @example
   * ```typescript
   * const { unsubscribe } = client.watchPaymentState(paymentInfoHash, (event) => {
   *   console.log('Payment state changed:', event);
   * });
   * // Later: unsubscribe();
   * ```
   */
  watchPaymentState(
    _paymentInfoHash: `0x${string}`,
    callback: (event: unknown) => void
  ): { unsubscribe: () => void } {
    const unsubscribers: (() => void)[] = [];

    // Watch ReleaseExecuted events
    const unsubscribeRelease = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: 'ReleaseExecuted',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });
    unsubscribers.push(unsubscribeRelease);

    // Watch RefundInEscrowExecuted events
    const unsubscribeRefundInEscrow = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: 'RefundInEscrowExecuted',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });
    unsubscribers.push(unsubscribeRefundInEscrow);

    // Watch RefundPostEscrowExecuted events
    const unsubscribeRefundPostEscrow = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: 'RefundPostEscrowExecuted',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });
    unsubscribers.push(unsubscribeRefundPostEscrow);

    return {
      unsubscribe: () => {
        for (const unsub of unsubscribers) {
          unsub();
        }
      },
    };
  }

  /**
   * Watch for refund request events
   *
   * @param callback - Callback function called on refund request events
   * @returns Object with unsubscribe function
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { unsubscribe } = client.watchRefundRequests((event) => {
   *   console.log('Refund event:', event);
   * });
   * // Later: unsubscribe();
   * ```
   */
  watchRefundRequests(callback: (event: unknown) => void): { unsubscribe: () => void } {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const unsubscribers: (() => void)[] = [];

    // Watch RefundRequested events
    const unsubscribeRequested = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: 'RefundRequested',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });
    unsubscribers.push(unsubscribeRequested);

    // Watch RefundRequestStatusUpdated events
    const unsubscribeStatusUpdated = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: 'RefundRequestStatusUpdated',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });
    unsubscribers.push(unsubscribeStatusUpdated);

    // Watch RefundRequestCancelled events
    const unsubscribeCancelled = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: 'RefundRequestCancelled',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });
    unsubscribers.push(unsubscribeCancelled);

    return {
      unsubscribe: () => {
        for (const unsub of unsubscribers) {
          unsub();
        }
      },
    };
  }

  /**
   * Watch for new payments where the current wallet is the payer
   *
   * @param callback - Callback function called on new payment events
   * @returns Object with unsubscribe function
   * @throws Error if walletClient is not configured
   *
   * @example
   * ```typescript
   * const { unsubscribe } = client.watchMyPayments((event) => {
   *   console.log('New payment:', event);
   * });
   * // Later: unsubscribe();
   * ```
   */
  watchMyPayments(callback: (event: unknown) => void): { unsubscribe: () => void } {
    if (!this.walletClient?.account) {
      throw new Error('WalletClient required');
    }

    const payerAddress = this.walletClient.account.address;

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: 'AuthorizationCreated',
      args: {
        payer: payerAddress,
      },
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });

    return { unsubscribe };
  }

  /**
   * Watch for freeze and unfreeze events
   *
   * @param freezeAddress - The Freeze contract address
   * @param callback - Callback function called on freeze events
   * @returns Object with unsubscribe function
   *
   * @example
   * ```typescript
   * const { unsubscribe } = client.watchFreezeEvents(freezeAddress, (event) => {
   *   console.log('Freeze event:', event);
   * });
   * // Later: unsubscribe();
   * ```
   */
  watchFreezeEvents(
    freezeAddress: `0x${string}`,
    callback: (event: unknown) => void
  ): { unsubscribe: () => void } {
    const unsubscribers: (() => void)[] = [];

    // Watch PaymentFrozen events
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
    unsubscribers.push(unsubscribeFrozen);

    // Watch PaymentUnfrozen events
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
    unsubscribers.push(unsubscribeUnfrozen);

    return {
      unsubscribe: () => {
        for (const unsub of unsubscribers) {
          unsub();
        }
      },
    };
  }
}
