/**
 * X402rClient - Client SDK for payers using X402r refundable payments
 * @module client
 */

import type { PublicClient, WalletClient } from "viem";
import {
  PaymentOperatorABI,
  AuthCaptureEscrowABI,
  RefundRequestABI,
  EscrowPeriodABI,
  FreezeABI,
  PaymentState,
  computePaymentInfoHash as sharedComputePaymentInfoHash,
  toAbiPaymentInfo,
  hasRefundRequest as sharedHasRefundRequest,
  getRefundRequest as sharedGetRefundRequest,
  getRefundStatus as sharedGetRefundStatus,
  getRefundRequestByKey as sharedGetRefundRequestByKey,
  getRefundRequestsByKeys as sharedGetRefundRequestsByKeys,
  isFrozen as sharedIsFrozen,
  watchFreezeEvents as sharedWatchFreezeEvents,
  submitEvidence as sharedSubmitEvidence,
  getEvidence as sharedGetEvidence,
  getEvidenceCount as sharedGetEvidenceCount,
  getEvidenceBatch as sharedGetEvidenceBatch,
  getAllEvidence as sharedGetAllEvidence,
  watchEvidenceSubmissions as sharedWatchEvidenceSubmissions,
  getPaymentState as sharedGetPaymentState,
  getPaymentDetails as sharedGetPaymentDetails,
  createRefundReadCtx,
  createEvidenceReadCtx,
  createEvidenceWriteCtx,
  type PaymentInfo,
  type PaymentStore,
  type RequestStatus,
  type RefundRequestData,
  type Evidence,
  type EvidenceEventLog,
  type FreezeEventLog,
  type PaymentOperatorEventLog,
  type RefundRequestEventLog,
} from "@x402r/core";

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
  /** Optional RefundRequestEvidence contract address */
  refundRequestEvidenceAddress?: `0x${string}`;
  /** Chain ID for hash computation (derived from publicClient.chain if omitted) */
  chainId?: number;
  /** Optional PaymentStore for caching PaymentInfo locally */
  paymentStore?: PaymentStore;
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
  /** RefundRequestEvidence contract address */
  readonly refundRequestEvidenceAddress?: `0x${string}`;
  /** Chain ID */
  readonly chainId: number;
  /** Optional PaymentStore for caching PaymentInfo locally */
  readonly paymentStore?: PaymentStore;

  constructor(config: X402rClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.operatorAddress = config.operatorAddress;
    this.escrowAddress = config.escrowAddress;
    this.refundRequestAddress = config.refundRequestAddress;
    this.refundRequestEvidenceAddress = config.refundRequestEvidenceAddress;
    const derivedChainId = config.chainId ?? config.publicClient.chain?.id;
    if (!derivedChainId) {
      throw new Error(
        "chainId required: pass chainId in config or create your publicClient with a chain " +
          "(e.g., createPublicClient({ chain: baseSepolia, transport: http() }))",
      );
    }
    this.chainId = derivedChainId;
    this.paymentStore = config.paymentStore;
  }

  /** Get the refund read context, throwing if refundRequestAddress is not configured */
  private getRefundCtx() {
    return createRefundReadCtx(this);
  }

  /** Assert that walletClient and account are available for write operations */
  private requireWalletAccount() {
    if (!this.walletClient) {
      throw new Error("WalletClient required");
    }
    if (!this.walletClient.account) {
      throw new Error(
        "WalletClient must have an account. Pass an account when creating the WalletClient: " +
          "createWalletClient({ account, chain, transport })",
      );
    }
    return this.walletClient as WalletClient & {
      account: NonNullable<WalletClient["account"]>;
    };
  }

  // ============ Payment Queries ============

  /**
   * Get the current state of a payment by reading the escrow contract.
   *
   * Derives the state from the on-chain escrow amounts and expiry timestamps:
   * - NonExistent: payment has never been authorized
   * - InEscrow: funds are held in escrow (capturableAmount > 0)
   * - Released: funds released to receiver, may still be refundable
   * - Settled: all funds have been moved (capturable = 0, refundable = 0)
   * - Expired: authorization expiry has passed and funds are still in escrow
   *
   * @param paymentInfo - The payment information struct
   * @returns The current PaymentState
   * @throws Error if escrowAddress is not configured
   */
  async getPaymentState(paymentInfo: PaymentInfo): Promise<PaymentState> {
    if (!this.escrowAddress) {
      throw new Error(
        "Escrow address required. Use resolveAddresses(networkId) from @x402r/core to get the escrow address for your network.",
      );
    }

    return sharedGetPaymentState(
      { publicClient: this.publicClient, escrowAddress: this.escrowAddress, chainId: this.chainId },
      paymentInfo,
    );
  }

  /**
   * Compute the paymentInfoHash for a PaymentInfo struct.
   *
   * Convenience wrapper that uses the instance's chainId and escrowAddress.
   *
   * @param paymentInfo - The payment information struct
   * @returns The bytes32 hash
   * @throws Error if escrowAddress is not configured
   */
  computePaymentInfoHash(paymentInfo: PaymentInfo): `0x${string}` {
    if (!this.escrowAddress) {
      throw new Error(
        "Escrow address required. Use resolveAddresses(networkId) from @x402r/core to get the escrow address for your network.",
      );
    }
    return sharedComputePaymentInfoHash(this.chainId, this.escrowAddress, paymentInfo);
  }

  /**
   * Check if a payment exists (has been authorized) by reading the escrow contract.
   *
   * @param paymentInfoHash - The hash of the PaymentInfo
   * @returns True if the payment has been authorized
   * @throws Error if escrowAddress is not configured
   */
  async paymentExists(paymentInfoHash: `0x${string}`): Promise<boolean> {
    if (!this.escrowAddress) {
      throw new Error(
        "Escrow address required. Use resolveAddresses(networkId) from @x402r/core to get the escrow address for your network.",
      );
    }

    const state = await this.publicClient.readContract({
      address: this.escrowAddress,
      abi: AuthCaptureEscrowABI,
      functionName: "paymentState",
      args: [paymentInfoHash],
    });

    const [hasCollectedPayment] = state as [boolean, bigint, bigint];
    return hasCollectedPayment;
  }

  /**
   * Check if a payment is currently in escrow (funds locked, not yet released).
   *
   * @param paymentInfoHash - The hash of the PaymentInfo
   * @returns True if funds are held in escrow (capturableAmount > 0)
   * @throws Error if escrowAddress is not configured
   */
  async isInEscrow(paymentInfoHash: `0x${string}`): Promise<boolean> {
    if (!this.escrowAddress) {
      throw new Error(
        "Escrow address required. Use resolveAddresses(networkId) from @x402r/core to get the escrow address for your network.",
      );
    }

    const state = await this.publicClient.readContract({
      address: this.escrowAddress,
      abi: AuthCaptureEscrowABI,
      functionName: "paymentState",
      args: [paymentInfoHash],
    });

    const [hasCollectedPayment, capturableAmount] = state as [boolean, bigint, bigint];
    return hasCollectedPayment && capturableAmount > 0n;
  }

  /**
   * Get the full PaymentInfo for a given hash.
   *
   * Resolution strategy:
   * 1. Check local PaymentStore (instant, zero RPC)
   * 2. Scan escrow `PaymentAuthorized` events by hash (1 getLogs call)
   * 3. Cache-fill: save to store if found via events
   *
   * @param paymentInfoHash - The hash of the PaymentInfo
   * @param fromBlock - Starting block for event scan fallback (default: earliest)
   * @returns The full PaymentInfo struct
   * @throws Error if PaymentInfo cannot be found in store or events
   * @throws Error if escrowAddress is not configured
   */
  async getPaymentDetails(
    paymentInfoHash: `0x${string}`,
    fromBlock?: bigint,
  ): Promise<PaymentInfo> {
    // Check local store first (doesn't require escrowAddress)
    if (this.paymentStore) {
      const cached = await this.paymentStore.load(paymentInfoHash);
      if (cached) return cached;
    }

    if (!this.escrowAddress) {
      throw new Error(
        "Escrow address required. Use resolveAddresses(networkId) from @x402r/core to get the escrow address for your network.",
      );
    }

    return sharedGetPaymentDetails(
      {
        publicClient: this.publicClient,
        escrowAddress: this.escrowAddress,
        paymentStore: this.paymentStore,
      },
      paymentInfoHash,
      fromBlock,
    );
  }

  /**
   * Get all payments where the current wallet is the payer.
   *
   * Returns full PaymentInfo structs by:
   * 1. Scanning `AuthorizationCreated` event logs on the operator (payer-indexed)
   * 2. Resolving each hash to full PaymentInfo via `getPaymentDetails()`
   *
   * @param fromBlock - Starting block for the scan (default: earliest)
   * @returns Array of objects containing the hash and full PaymentInfo
   * @throws Error if walletClient is not configured
   * @throws Error if escrowAddress is not configured
   */
  async getPayerPayments(
    fromBlock?: bigint,
  ): Promise<Array<{ hash: `0x${string}`; paymentInfo: PaymentInfo }>> {
    if (!this.walletClient?.account) {
      throw new Error("WalletClient required");
    }

    const logs = await this.publicClient.getContractEvents({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: "AuthorizationCreated",
      args: {
        payer: this.walletClient.account.address,
      },
      fromBlock: fromBlock ?? "earliest",
    });

    const hashes = logs
      .map(log => (log.args as { paymentInfoHash?: `0x${string}` }).paymentInfoHash)
      .filter((h): h is `0x${string}` => h !== undefined);

    const results: Array<{ hash: `0x${string}`; paymentInfo: PaymentInfo }> = [];
    for (const hash of hashes) {
      const paymentInfo = await this.getPaymentDetails(hash, fromBlock);
      results.push({ hash, paymentInfo });
    }
    return results;
  }

  // ============ Refund Operations ============

  /** Check if a refund request exists for a payment */
  async hasRefundRequest(paymentInfo: PaymentInfo, nonce: bigint): Promise<boolean> {
    return sharedHasRefundRequest(this.getRefundCtx(), paymentInfo, nonce);
  }

  /** Get the status of a refund request */
  async getRefundStatus(paymentInfo: PaymentInfo, nonce: bigint): Promise<RequestStatus> {
    return sharedGetRefundStatus(this.getRefundCtx(), paymentInfo, nonce);
  }

  /** Get the full refund request data */
  async getRefundRequest(paymentInfo: PaymentInfo, nonce: bigint): Promise<RefundRequestData> {
    return sharedGetRefundRequest(this.getRefundCtx(), paymentInfo, nonce);
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
    nonce: bigint,
  ): Promise<{ txHash: `0x${string}` }> {
    const walletClient = this.requireWalletAccount();

    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const txHash = await walletClient.writeContract({
      chain: walletClient.chain,
      account: walletClient.account,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: "requestRefund",
      args: [toAbiPaymentInfo(paymentInfo), amount, nonce],
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
    nonce: bigint,
  ): Promise<{ txHash: `0x${string}` }> {
    const walletClient = this.requireWalletAccount();

    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const txHash = await walletClient.writeContract({
      chain: walletClient.chain,
      account: walletClient.account,
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: "cancelRefundRequest",
      args: [toAbiPaymentInfo(paymentInfo), nonce],
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
    count: bigint,
  ): Promise<{ keys: readonly `0x${string}`[]; total: bigint }> {
    if (!this.walletClient?.account) {
      throw new Error("WalletClient required");
    }

    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const payerAddress = this.walletClient.account.address;

    const [keys, total] = (await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: "getPayerRefundRequests",
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
      throw new Error("WalletClient required");
    }

    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const payerAddress = this.walletClient.account.address;

    const count = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: "payerRefundRequestCount",
      args: [payerAddress],
    });

    return count as bigint;
  }

  /** Get refund request data by composite key */
  async getRefundRequestByKey(compositeKey: `0x${string}`): Promise<RefundRequestData> {
    return sharedGetRefundRequestByKey(this.getRefundCtx(), compositeKey);
  }

  /** Batch-fetch refund request data for multiple composite keys */
  async getRefundRequestsByKeys(
    keys: readonly `0x${string}`[],
    options?: { concurrency?: number },
  ): Promise<Array<{ key: `0x${string}`; data?: RefundRequestData; error?: string }>> {
    return sharedGetRefundRequestsByKeys(this.getRefundCtx(), keys, options);
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
    freezeAddress: `0x${string}`,
  ): Promise<{ txHash: `0x${string}` }> {
    const walletClient = this.requireWalletAccount();

    const txHash = await walletClient.writeContract({
      chain: walletClient.chain,
      account: walletClient.account,
      address: freezeAddress,
      abi: FreezeABI,
      functionName: "freeze",
      args: [toAbiPaymentInfo(paymentInfo)],
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
    freezeAddress: `0x${string}`,
  ): Promise<{ txHash: `0x${string}` }> {
    const walletClient = this.requireWalletAccount();

    const txHash = await walletClient.writeContract({
      chain: walletClient.chain,
      account: walletClient.account,
      address: freezeAddress,
      abi: FreezeABI,
      functionName: "unfreeze",
      args: [toAbiPaymentInfo(paymentInfo)],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /** Check if a payment is currently frozen */
  async isFrozen(paymentInfo: PaymentInfo, freezeAddress: `0x${string}`): Promise<boolean> {
    return sharedIsFrozen({ publicClient: this.publicClient }, paymentInfo, freezeAddress);
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
    escrowPeriodAddress: `0x${string}`,
  ): Promise<bigint> {
    const authTime = await this.publicClient.readContract({
      address: escrowPeriodAddress,
      abi: EscrowPeriodABI,
      functionName: "getAuthorizationTime",
      args: [toAbiPaymentInfo(paymentInfo)],
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
    escrowPeriodAddress: `0x${string}`,
  ): Promise<boolean> {
    const inEscrow = await this.publicClient.readContract({
      address: escrowPeriodAddress,
      abi: EscrowPeriodABI,
      functionName: "isDuringEscrowPeriod",
      args: [toAbiPaymentInfo(paymentInfo)],
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
    callback: (event: PaymentOperatorEventLog) => void,
  ): { unsubscribe: () => void } {
    const unsubscribers: (() => void)[] = [];

    // Watch ReleaseExecuted events
    const unsubscribeRelease = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: "ReleaseExecuted",
      onLogs: logs => {
        for (const log of logs) {
          callback(log as unknown as PaymentOperatorEventLog);
        }
      },
    });
    unsubscribers.push(unsubscribeRelease);

    // Watch RefundInEscrowExecuted events
    const unsubscribeRefundInEscrow = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: "RefundInEscrowExecuted",
      onLogs: logs => {
        for (const log of logs) {
          callback(log as unknown as PaymentOperatorEventLog);
        }
      },
    });
    unsubscribers.push(unsubscribeRefundInEscrow);

    // Watch RefundPostEscrowExecuted events
    const unsubscribeRefundPostEscrow = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: "RefundPostEscrowExecuted",
      onLogs: logs => {
        for (const log of logs) {
          callback(log as unknown as PaymentOperatorEventLog);
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
  watchRefundRequests(callback: (event: RefundRequestEventLog) => void): {
    unsubscribe: () => void;
  } {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const unsubscribers: (() => void)[] = [];

    // Watch RefundRequested events
    const unsubscribeRequested = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: "RefundRequested",
      onLogs: logs => {
        for (const log of logs) {
          callback(log as unknown as RefundRequestEventLog);
        }
      },
    });
    unsubscribers.push(unsubscribeRequested);

    // Watch RefundRequestStatusUpdated events
    const unsubscribeStatusUpdated = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: "RefundRequestStatusUpdated",
      onLogs: logs => {
        for (const log of logs) {
          callback(log as unknown as RefundRequestEventLog);
        }
      },
    });
    unsubscribers.push(unsubscribeStatusUpdated);

    // Watch RefundRequestCancelled events
    const unsubscribeCancelled = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: "RefundRequestCancelled",
      onLogs: logs => {
        for (const log of logs) {
          callback(log as unknown as RefundRequestEventLog);
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
  watchMyPayments(callback: (event: PaymentOperatorEventLog) => void): {
    unsubscribe: () => void;
  } {
    if (!this.walletClient?.account) {
      throw new Error("WalletClient required");
    }

    const payerAddress = this.walletClient.account.address;

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: "AuthorizationCreated",
      args: {
        payer: payerAddress,
      },
      onLogs: logs => {
        for (const log of logs) {
          callback(log as unknown as PaymentOperatorEventLog);
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
    callback: (event: FreezeEventLog) => void,
  ): { unsubscribe: () => void } {
    return sharedWatchFreezeEvents({ publicClient: this.publicClient }, freezeAddress, callback);
  }

  // ============ Evidence Operations ============

  /** Get the evidence read context, throwing if refundRequestEvidenceAddress is not configured */
  private getEvidenceCtx() {
    return createEvidenceReadCtx(this);
  }

  /** Get the evidence write context, throwing if refundRequestEvidenceAddress is not configured */
  private getEvidenceWriteCtx() {
    return createEvidenceWriteCtx(this);
  }

  /**
   * Submit evidence for a dispute as an IPFS CID
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @param cid - IPFS CID pointing to the evidence content
   * @returns Transaction hash
   */
  async submitEvidence(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    cid: string,
  ): Promise<{ txHash: `0x${string}` }> {
    return sharedSubmitEvidence(this.getEvidenceWriteCtx(), paymentInfo, nonce, cid);
  }

  /**
   * Get a single evidence entry by index
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index identifying which charge
   * @param index - The evidence entry index (0-based)
   * @returns The evidence entry
   */
  async getEvidence(paymentInfo: PaymentInfo, nonce: bigint, index: bigint): Promise<Evidence> {
    return sharedGetEvidence(this.getEvidenceCtx(), paymentInfo, nonce, index);
  }

  /**
   * Get the total number of evidence entries for a payment+nonce
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index identifying which charge
   * @returns The count of evidence entries
   */
  async getEvidenceCount(paymentInfo: PaymentInfo, nonce: bigint): Promise<bigint> {
    return sharedGetEvidenceCount(this.getEvidenceCtx(), paymentInfo, nonce);
  }

  /**
   * Get a batch of evidence entries with pagination
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index identifying which charge
   * @param offset - Starting index (0-based)
   * @param count - Number of entries to return
   * @returns Object with entries array and total count
   */
  async getEvidenceBatch(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    offset: bigint,
    count: bigint,
  ): Promise<{ entries: Evidence[]; total: bigint }> {
    return sharedGetEvidenceBatch(this.getEvidenceCtx(), paymentInfo, nonce, offset, count);
  }

  /**
   * Get all evidence entries for a payment+nonce
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index identifying which charge
   * @returns Array of all evidence entries
   */
  async getAllEvidence(paymentInfo: PaymentInfo, nonce: bigint): Promise<Evidence[]> {
    return sharedGetAllEvidence(this.getEvidenceCtx(), paymentInfo, nonce);
  }

  /**
   * Watch for new evidence submissions
   *
   * @param callback - Callback function called when evidence is submitted
   * @returns Object with unsubscribe function
   */
  watchEvidenceSubmissions(callback: (event: EvidenceEventLog) => void): {
    unsubscribe: () => void;
  } {
    return sharedWatchEvidenceSubmissions(this.getEvidenceCtx(), callback);
  }
}
