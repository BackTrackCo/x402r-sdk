/**
 * X402rArbiter - Arbiter SDK for dispute resolution in X402r refundable payments
 * @module arbiter
 */

import type { PublicClient, WalletClient } from 'viem';
import {
  PaymentOperatorABI,
  RefundRequestABI,
  ArbiterRegistryABI,
  RequestStatus,
  NotImplementedError,
  computePaymentInfoHash,
  hasRefundRequest as sharedHasRefundRequest,
  getRefundRequest as sharedGetRefundRequest,
  getRefundStatus as sharedGetRefundStatus,
  getRefundRequestByKey as sharedGetRefundRequestByKey,
  approveRefundRequest as sharedApproveRefundRequest,
  denyRefundRequest as sharedDenyRefundRequest,
  isFrozen as sharedIsFrozen,
  watchFreezeEvents as sharedWatchFreezeEvents,
  type PaymentInfo,
  type PaymentState,
  type RefundRequestData,
  type ArbiterList,
  type FreezeEventLog,
  type RefundRequestEventLog,
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
  /** Optional ArbiterRegistry contract address */
  arbiterRegistryAddress?: `0x${string}`;
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
 * const { txHash } = await arbiter.approveRefundRequest(paymentInfo, 0n);
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
  /** ArbiterRegistry contract address */
  readonly arbiterRegistryAddress?: `0x${string}`;
  /** Chain ID */
  readonly chainId: number;

  constructor(config: X402rArbiterConfig) {
    if (!config.walletClient.account) {
      throw new Error(
        'WalletClient must have an account. Pass an account when creating the WalletClient: ' +
        'createWalletClient({ account, chain, transport })'
      );
    }
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.operatorAddress = config.operatorAddress;
    this.escrowAddress = config.escrowAddress;
    this.refundRequestAddress = config.refundRequestAddress;
    this.arbiterRegistryAddress = config.arbiterRegistryAddress;
    this.chainId = config.chainId ?? 84532;
  }

  /** Get the refund read context, throwing if refundRequestAddress is not configured */
  private getRefundCtx() {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }
    return { publicClient: this.publicClient, refundRequestAddress: this.refundRequestAddress };
  }

  /** Get the refund write context, throwing if refundRequestAddress is not configured */
  private getRefundWriteCtx() {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }
    return {
      publicClient: this.publicClient,
      walletClient: this.walletClient,
      refundRequestAddress: this.refundRequestAddress,
    };
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
    return sharedHasRefundRequest(this.getRefundCtx(), paymentInfo, nonce);
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
    return sharedGetRefundRequest(this.getRefundCtx(), paymentInfo, nonce);
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
   * const { txHash } = await arbiter.approveRefundRequest(paymentInfo, 0n);
   * console.log(`Refund approved: ${txHash}`);
   * ```
   */
  async approveRefundRequest(
    paymentInfo: PaymentInfo,
    nonce: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    return sharedApproveRefundRequest(this.getRefundWriteCtx(), paymentInfo, nonce);
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
   * const { txHash } = await arbiter.denyRefundRequest(paymentInfo, 0n);
   * console.log(`Refund denied: ${txHash}`);
   * ```
   */
  async denyRefundRequest(
    paymentInfo: PaymentInfo,
    nonce: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    return sharedDenyRefundRequest(this.getRefundWriteCtx(), paymentInfo, nonce);
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
   * @remarks
   * Items are processed sequentially (not atomically) to ensure correct nonce ordering.
   * If one item fails, previously approved items will NOT be rolled back.
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
      const result = await this.approveRefundRequest(paymentInfo, nonce);
      results.push(result);
    }

    return results;
  }

  /**
   * Deny multiple refund requests in batch
   *
   * @remarks
   * Items are processed sequentially (not atomically) to ensure correct nonce ordering.
   * If one item fails, previously denied items will NOT be rolled back.
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
      const result = await this.denyRefundRequest(paymentInfo, nonce);
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
   * const { keys, total } = await arbiter.getPendingRefundRequests(0n, 10n, '0x...');
   * console.log(`${total} total cases, showing first ${keys.length}`);
   * ```
   */
  async getPendingRefundRequests(
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
    return sharedGetRefundStatus(this.getRefundCtx(), paymentInfo, nonce);
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
    return sharedGetRefundRequestByKey(this.getRefundCtx(), compositeKey);
  }

  /**
   * Resolve PaymentInfo and nonce from a composite key by scanning RefundRequested events.
   *
   * The RefundRequest contract stores only the hash of PaymentInfo, not the full struct.
   * However, `RefundRequested` events emit the full PaymentInfo. This method scans those
   * events, computes hashes, and returns the matching PaymentInfo for a given composite key.
   *
   * @param compositeKey - The composite key from getPendingRefundRequests
   * @param fromBlock - Block to start scanning from (default: earliest, 0n)
   * @returns The PaymentInfo and nonce, or null if not found in event logs
   * @throws Error if refundRequestAddress or escrowAddress is not configured
   *
   * @example
   * ```typescript
   * const result = await arbiter.getPaymentInfoFromEvents(compositeKey);
   * if (result) {
   *   await arbiter.approveRefundRequest(result.paymentInfo, result.nonce);
   * }
   * ```
   */
  async getPaymentInfoFromEvents(
    compositeKey: `0x${string}`,
    fromBlock: bigint = 0n
  ): Promise<{ paymentInfo: PaymentInfo; nonce: bigint } | null> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }
    if (!this.escrowAddress) {
      throw new Error('Escrow address required for hash computation');
    }

    // First, get the stored paymentInfoHash and nonce from the request data
    const requestData = await this.getRefundRequestByKey(compositeKey);
    const targetPaymentInfoHash = requestData.paymentInfoHash;
    const targetNonce = requestData.nonce;

    // Scan RefundRequested events to find the matching PaymentInfo
    const logs = await this.publicClient.getLogs({
      address: this.refundRequestAddress,
      event: {
        name: 'RefundRequested',
        type: 'event',
        inputs: [
          {
            name: 'paymentInfo',
            type: 'tuple',
            indexed: false,
            components: [
              { name: 'operator', type: 'address' },
              { name: 'payer', type: 'address' },
              { name: 'receiver', type: 'address' },
              { name: 'token', type: 'address' },
              { name: 'maxAmount', type: 'uint120' },
              { name: 'preApprovalExpiry', type: 'uint48' },
              { name: 'authorizationExpiry', type: 'uint48' },
              { name: 'refundExpiry', type: 'uint48' },
              { name: 'minFeeBps', type: 'uint16' },
              { name: 'maxFeeBps', type: 'uint16' },
              { name: 'feeReceiver', type: 'address' },
              { name: 'salt', type: 'uint256' },
            ],
          },
          { name: 'payer', type: 'address', indexed: true },
          { name: 'receiver', type: 'address', indexed: true },
          { name: 'amount', type: 'uint120', indexed: false },
          { name: 'nonce', type: 'uint256', indexed: false },
        ],
      },
      fromBlock,
      toBlock: 'latest',
    });

    for (const log of logs) {
      const args = log.args as {
        paymentInfo?: {
          operator: `0x${string}`;
          payer: `0x${string}`;
          receiver: `0x${string}`;
          token: `0x${string}`;
          maxAmount: bigint;
          preApprovalExpiry: bigint;
          authorizationExpiry: bigint;
          refundExpiry: bigint;
          minFeeBps: number;
          maxFeeBps: number;
          feeReceiver: `0x${string}`;
          salt: bigint;
        };
        nonce?: bigint;
      };

      if (!args.paymentInfo) continue;

      const paymentInfo: PaymentInfo = {
        operator: args.paymentInfo.operator,
        payer: args.paymentInfo.payer,
        receiver: args.paymentInfo.receiver,
        token: args.paymentInfo.token,
        maxAmount: args.paymentInfo.maxAmount,
        preApprovalExpiry: args.paymentInfo.preApprovalExpiry,
        authorizationExpiry: args.paymentInfo.authorizationExpiry,
        refundExpiry: args.paymentInfo.refundExpiry,
        minFeeBps: args.paymentInfo.minFeeBps,
        maxFeeBps: args.paymentInfo.maxFeeBps,
        feeReceiver: args.paymentInfo.feeReceiver,
        salt: args.paymentInfo.salt,
      };

      // Compute the hash using the same algorithm as the escrow contract
      const hash = computePaymentInfoHash(paymentInfo, this.escrowAddress, this.chainId);

      if (hash === targetPaymentInfoHash && args.nonce === targetNonce) {
        return { paymentInfo, nonce: targetNonce };
      }
    }

    return null;
  }

  // ============ Freeze Operations ============

  /**
   * Check if a payment is currently frozen
   *
   * @param paymentInfo - The payment information struct
   * @param freezeAddress - The Freeze contract address
   * @returns True if payment is frozen
   *
   * @example
   * ```typescript
   * if (await arbiter.isFrozen(paymentInfo, freezeAddress)) {
   *   console.log('Payment is frozen');
   * }
   * ```
   */
  async isFrozen(
    paymentInfo: PaymentInfo,
    freezeAddress: `0x${string}`
  ): Promise<boolean> {
    return sharedIsFrozen({ publicClient: this.publicClient }, paymentInfo, freezeAddress);
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
  watchNewCases(callback: (event: RefundRequestEventLog) => void): { unsubscribe: () => void } {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: 'RefundRequested',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log as unknown as RefundRequestEventLog);
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
  watchDecisions(callback: (event: RefundRequestEventLog) => void): { unsubscribe: () => void } {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: 'RefundRequestStatusUpdated',
      onLogs: (logs) => {
        for (const log of logs) {
          callback(log as unknown as RefundRequestEventLog);
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
    callback: (event: FreezeEventLog) => void
  ): { unsubscribe: () => void } {
    return sharedWatchFreezeEvents({ publicClient: this.publicClient }, freezeAddress, callback);
  }

  // ============ Registry Operations ============

  /**
   * Register as an arbiter in the ArbiterRegistry
   *
   * @param uri - The URI pointing to arbiter metadata/API endpoint
   * @returns Transaction hash
   * @throws Error if arbiterRegistryAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await arbiter.registerArbiter('https://arbiter.example.com/api/disputes');
   * console.log(`Registered: ${txHash}`);
   * ```
   */
  async registerArbiter(uri: string): Promise<{ txHash: `0x${string}` }> {
    if (!this.arbiterRegistryAddress) {
      throw new Error('ArbiterRegistry address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: 'register',
      args: [uri],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Update the URI for a registered arbiter
   *
   * @param newUri - The new URI
   * @returns Transaction hash
   * @throws Error if arbiterRegistryAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await arbiter.updateArbiterUri('https://new-arbiter.example.com/api');
   * console.log(`Updated: ${txHash}`);
   * ```
   */
  async updateArbiterUri(newUri: string): Promise<{ txHash: `0x${string}` }> {
    if (!this.arbiterRegistryAddress) {
      throw new Error('ArbiterRegistry address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: 'updateUri',
      args: [newUri],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Deregister from the ArbiterRegistry
   *
   * @returns Transaction hash
   * @throws Error if arbiterRegistryAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await arbiter.deregisterArbiter();
   * console.log(`Deregistered: ${txHash}`);
   * ```
   */
  async deregisterArbiter(): Promise<{ txHash: `0x${string}` }> {
    if (!this.arbiterRegistryAddress) {
      throw new Error('ArbiterRegistry address required');
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: 'deregister',
      args: [],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Get the URI for a registered arbiter
   *
   * @param arbiter - The arbiter address to query
   * @returns The arbiter's URI (empty string if not registered)
   * @throws Error if arbiterRegistryAddress is not configured
   *
   * @example
   * ```typescript
   * const uri = await arbiter.getArbiterUri('0x...');
   * console.log(`URI: ${uri}`);
   * ```
   */
  async getArbiterUri(arbiter: `0x${string}`): Promise<string> {
    if (!this.arbiterRegistryAddress) {
      throw new Error('ArbiterRegistry address required');
    }

    const uri = await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: 'getUri',
      args: [arbiter],
    });

    return uri as string;
  }

  /**
   * Check if an address is a registered arbiter
   *
   * @param arbiter - The address to check
   * @returns True if registered
   * @throws Error if arbiterRegistryAddress is not configured
   *
   * @example
   * ```typescript
   * const isRegistered = await arbiter.isArbiterRegistered('0x...');
   * console.log(`Registered: ${isRegistered}`);
   * ```
   */
  async isArbiterRegistered(arbiter: `0x${string}`): Promise<boolean> {
    if (!this.arbiterRegistryAddress) {
      throw new Error('ArbiterRegistry address required');
    }

    const isRegistered = await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: 'isRegistered',
      args: [arbiter],
    });

    return isRegistered as boolean;
  }

  /**
   * Get the total number of registered arbiters
   *
   * @returns The count of registered arbiters
   * @throws Error if arbiterRegistryAddress is not configured
   *
   * @example
   * ```typescript
   * const count = await arbiter.getArbiterCount();
   * console.log(`Total arbiters: ${count}`);
   * ```
   */
  async getArbiterCount(): Promise<bigint> {
    if (!this.arbiterRegistryAddress) {
      throw new Error('ArbiterRegistry address required');
    }

    const count = await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: 'arbiterCount',
      args: [],
    });

    return count as bigint;
  }

  /**
   * Get a paginated list of arbiters
   *
   * @param offset - Starting index (0-based)
   * @param count - Number of arbiters to return
   * @returns Object with arbiters array, uris array, and total count
   * @throws Error if arbiterRegistryAddress is not configured
   *
   * @example
   * ```typescript
   * const { arbiters, uris, total } = await arbiter.listArbiters(0n, 10n);
   * console.log(`Found ${total} total arbiters, showing first ${arbiters.length}`);
   * for (let i = 0; i < arbiters.length; i++) {
   *   console.log(`${arbiters[i]}: ${uris[i]}`);
   * }
   * ```
   */
  async listArbiters(offset: bigint, count: bigint): Promise<ArbiterList> {
    if (!this.arbiterRegistryAddress) {
      throw new Error('ArbiterRegistry address required');
    }

    const [arbiters, uris, total] = (await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: 'getArbiters',
      args: [offset, count],
    })) as [readonly `0x${string}`[], readonly string[], bigint];

    return { arbiters, uris, total };
  }
}
