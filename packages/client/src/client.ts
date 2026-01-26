/**
 * X402rClient - Client SDK for payers using X402r refundable payments
 * @module client
 */

import type { PublicClient, WalletClient } from 'viem';
import {
  PaymentOperatorABI,
  RefundRequestABI,
  EscrowPeriodRecorderABI,
  type PaymentInfo,
  type PaymentState,
  type RequestStatus,
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
      args: [paymentInfo as never],
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

    // viem infers uint48 as number, but we use bigint for consistency
    return paymentInfo as unknown as PaymentInfo;
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

  // ============ Refund Operations ============

  /**
   * Check if a refund request exists for a payment
   *
   * @param paymentInfo - The payment information struct
   * @returns True if a refund request exists
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const hasRequest = await client.hasRefundRequest(paymentInfo);
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

  /**
   * Get the status of a refund request
   *
   * @param paymentInfo - The payment information struct
   * @returns The refund request status (Pending, Approved, Denied, Cancelled)
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const status = await client.getRefundStatus(paymentInfo);
   * if (status === RequestStatus.Pending) {
   *   console.log('Refund request is pending');
   * }
   * ```
   */
  async getRefundStatus(paymentInfo: PaymentInfo): Promise<RequestStatus> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const status = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getRefundRequestStatus',
      args: [paymentInfo as never],
    });

    return status as RequestStatus;
  }

  /**
   * Submit a refund request for a payment
   *
   * @param paymentInfo - The payment information struct
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.requestRefund(paymentInfo);
   * console.log(`Refund requested: ${txHash}`);
   * ```
   */
  async requestRefund(paymentInfo: PaymentInfo): Promise<{ txHash: `0x${string}` }> {
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
      args: [paymentInfo as never],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Cancel a pending refund request
   *
   * @param paymentInfo - The payment information struct
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.cancelRefundRequest(paymentInfo);
   * console.log(`Refund request cancelled: ${txHash}`);
   * ```
   */
  async cancelRefundRequest(paymentInfo: PaymentInfo): Promise<{ txHash: `0x${string}` }> {
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
      args: [paymentInfo as never],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Get all refund request hashes for the current wallet
   *
   * @returns Array of payment info hashes with refund requests
   * @throws Error if walletClient is not configured
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const hashes = await client.getMyRefundRequests();
   * for (const hash of hashes) {
   *   console.log(`Refund request: ${hash}`);
   * }
   * ```
   */
  async getMyRefundRequests(): Promise<readonly `0x${string}`[]> {
    if (!this.walletClient?.account) {
      throw new Error('WalletClient required');
    }

    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const payerAddress = this.walletClient.account.address;

    const hashes = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getPayerRefundRequestHashes',
      args: [payerAddress],
    });

    return hashes as readonly `0x${string}`[];
  }

  // ============ Escrow Operations ============

  /**
   * Freeze a payment to extend the escrow period
   *
   * @param paymentInfo - The payment information struct
   * @param recorderAddress - The EscrowPeriodRecorder contract address
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.freezePayment(paymentInfo, recorderAddress);
   * console.log(`Payment frozen: ${txHash}`);
   * ```
   */
  async freezePayment(
    paymentInfo: PaymentInfo,
    recorderAddress: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.walletClient) {
      throw new Error('WalletClient required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: recorderAddress,
      abi: EscrowPeriodRecorderABI,
      functionName: 'freeze',
      args: [paymentInfo as never],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Unfreeze a payment that was previously frozen
   *
   * @param paymentInfo - The payment information struct
   * @param recorderAddress - The EscrowPeriodRecorder contract address
   * @returns Transaction hash
   * @throws Error if walletClient is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await client.unfreezePayment(paymentInfo, recorderAddress);
   * console.log(`Payment unfrozen: ${txHash}`);
   * ```
   */
  async unfreezePayment(
    paymentInfo: PaymentInfo,
    recorderAddress: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
    if (!this.walletClient) {
      throw new Error('WalletClient required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: recorderAddress,
      abi: EscrowPeriodRecorderABI,
      functionName: 'unfreeze',
      args: [paymentInfo as never],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Check if a payment is currently frozen
   *
   * @param paymentInfo - The payment information struct
   * @param recorderAddress - The EscrowPeriodRecorder contract address
   * @returns True if payment is frozen
   *
   * @example
   * ```typescript
   * if (await client.isFrozen(paymentInfo, recorderAddress)) {
   *   console.log('Payment is frozen');
   * }
   * ```
   */
  async isFrozen(
    paymentInfo: PaymentInfo,
    recorderAddress: `0x${string}`
  ): Promise<boolean> {
    const frozen = await this.publicClient.readContract({
      address: recorderAddress,
      abi: EscrowPeriodRecorderABI,
      functionName: 'isFrozen',
      args: [paymentInfo as never],
    });

    return frozen as boolean;
  }

  /**
   * Get the authorization time for a payment
   *
   * @param paymentInfo - The payment information struct
   * @param recorderAddress - The EscrowPeriodRecorder contract address
   * @returns The timestamp when the payment was authorized
   *
   * @example
   * ```typescript
   * const authTime = await client.getAuthorizationTime(paymentInfo, recorderAddress);
   * console.log(`Authorized at: ${new Date(Number(authTime) * 1000)}`);
   * ```
   */
  async getAuthorizationTime(
    paymentInfo: PaymentInfo,
    recorderAddress: `0x${string}`
  ): Promise<bigint> {
    const authTime = await this.publicClient.readContract({
      address: recorderAddress,
      abi: EscrowPeriodRecorderABI,
      functionName: 'getAuthorizationTime',
      args: [paymentInfo as never],
    });

    return authTime as bigint;
  }

  /**
   * Check if the escrow period has passed for a payment
   *
   * @param paymentInfo - The payment information struct
   * @param recorderAddress - The EscrowPeriodRecorder contract address
   * @returns Object with passed status and authorization time
   *
   * @example
   * ```typescript
   * const { passed, authTime } = await client.isEscrowPeriodPassed(paymentInfo, recorderAddress);
   * if (passed) {
   *   console.log('Escrow period has passed');
   * }
   * ```
   */
  async isEscrowPeriodPassed(
    paymentInfo: PaymentInfo,
    recorderAddress: `0x${string}`
  ): Promise<{ passed: boolean; authTime: bigint }> {
    const [passed, authTime] = (await this.publicClient.readContract({
      address: recorderAddress,
      abi: EscrowPeriodRecorderABI,
      functionName: 'isEscrowPeriodPassed',
      args: [paymentInfo as never],
    })) as [boolean, bigint];

    return { passed, authTime };
  }

  // ============ Subscriptions ============

  /**
   * Watch for payment state changes (releases and refunds)
   *
   * @param paymentInfoHash - The hash of the PaymentInfo to watch
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

    // Watch RefundExecuted events
    const unsubscribeRefund = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: 'RefundExecuted',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log);
        }
      },
    });
    unsubscribers.push(unsubscribeRefund);

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
   * @param recorderAddress - The EscrowPeriodRecorder contract address
   * @param callback - Callback function called on freeze events
   * @returns Object with unsubscribe function
   *
   * @example
   * ```typescript
   * const { unsubscribe } = client.watchFreezeEvents(recorderAddress, (event) => {
   *   console.log('Freeze event:', event);
   * });
   * // Later: unsubscribe();
   * ```
   */
  watchFreezeEvents(
    recorderAddress: `0x${string}`,
    callback: (event: unknown) => void
  ): { unsubscribe: () => void } {
    const unsubscribers: (() => void)[] = [];

    // Watch PaymentFrozen events
    const unsubscribeFrozen = this.publicClient.watchContractEvent({
      address: recorderAddress,
      abi: EscrowPeriodRecorderABI,
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
      address: recorderAddress,
      abi: EscrowPeriodRecorderABI,
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
