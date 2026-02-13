/**
 * X402rArbiter - Arbiter SDK for dispute resolution in X402r refundable payments
 * @module arbiter
 */

import type { PublicClient, WalletClient } from "viem";
import {
  PaymentOperatorABI,
  AuthCaptureEscrowABI,
  RefundRequestABI,
  ArbiterRegistryABI,
  RequestStatus,
  PaymentState,
  computePaymentInfoHash,
  toAbiPaymentInfo,
  hasRefundRequest as sharedHasRefundRequest,
  getRefundRequest as sharedGetRefundRequest,
  getRefundStatus as sharedGetRefundStatus,
  getRefundRequestByKey as sharedGetRefundRequestByKey,
  approveRefundRequest as sharedApproveRefundRequest,
  denyRefundRequest as sharedDenyRefundRequest,
  isFrozen as sharedIsFrozen,
  watchFreezeEvents as sharedWatchFreezeEvents,
  submitEvidence as sharedSubmitEvidence,
  getEvidence as sharedGetEvidence,
  getEvidenceCount as sharedGetEvidenceCount,
  getEvidenceBatch as sharedGetEvidenceBatch,
  getAllEvidence as sharedGetAllEvidence,
  watchEvidenceSubmissions as sharedWatchEvidenceSubmissions,
  type PaymentInfo,
  type RefundRequestData,
  type ArbiterList,
  type Evidence,
  type EvidenceEventLog,
  type FreezeEventLog,
  type RefundRequestEventLog,
} from "@x402r/core";

/**
 * Result of a batch operation item
 */
export type BatchResult =
  | { success: true; txHash: `0x${string}` }
  | { success: false; error: string };

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
  /** Optional RefundRequestEvidence contract address */
  refundRequestEvidenceAddress?: `0x${string}`;
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
  /** RefundRequestEvidence contract address */
  readonly refundRequestEvidenceAddress?: `0x${string}`;
  /** Chain ID */
  readonly chainId: number;

  constructor(config: X402rArbiterConfig) {
    if (!config.walletClient.account) {
      throw new Error(
        "WalletClient must have an account. Pass an account when creating the WalletClient: " +
          "createWalletClient({ account, chain, transport })",
      );
    }
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.operatorAddress = config.operatorAddress;
    this.escrowAddress = config.escrowAddress;
    this.refundRequestAddress = config.refundRequestAddress;
    this.arbiterRegistryAddress = config.arbiterRegistryAddress;
    this.refundRequestEvidenceAddress = config.refundRequestEvidenceAddress;
    this.chainId = config.chainId ?? 84532;
  }

  /** Get the refund read context, throwing if refundRequestAddress is not configured */
  private getRefundCtx() {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }
    return {
      publicClient: this.publicClient,
      refundRequestAddress: this.refundRequestAddress,
    };
  }

  /** Get the refund write context, throwing if refundRequestAddress is not configured */
  private getRefundWriteCtx() {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }
    return {
      publicClient: this.publicClient,
      walletClient: this.walletClient,
      refundRequestAddress: this.refundRequestAddress,
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

    const paymentInfoHash = computePaymentInfoHash(paymentInfo, this.escrowAddress, this.chainId);

    const state = await this.publicClient.readContract({
      address: this.escrowAddress,
      abi: AuthCaptureEscrowABI,
      functionName: "paymentState",
      args: [paymentInfoHash],
    });

    const [hasCollectedPayment, capturableAmount, refundableAmount] = state as [
      boolean,
      bigint,
      bigint,
    ];

    if (!hasCollectedPayment) {
      return PaymentState.NonExistent;
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    if (
      capturableAmount > 0n &&
      paymentInfo.authorizationExpiry > 0n &&
      now > paymentInfo.authorizationExpiry
    ) {
      return PaymentState.Expired;
    }

    if (capturableAmount > 0n) {
      return PaymentState.InEscrow;
    }

    if (refundableAmount > 0n) {
      return PaymentState.Released;
    }

    return PaymentState.Settled;
  }

  /** Check if a refund request exists for a payment */
  async hasRefundRequest(paymentInfo: PaymentInfo, nonce: bigint): Promise<boolean> {
    return sharedHasRefundRequest(this.getRefundCtx(), paymentInfo, nonce);
  }

  /** Get the full refund request data */
  async getRefundRequest(paymentInfo: PaymentInfo, nonce: bigint): Promise<RefundRequestData> {
    return sharedGetRefundRequest(this.getRefundCtx(), paymentInfo, nonce);
  }

  // ============ Decision Submission ============

  /** Approve a refund request as the arbiter */
  async approveRefundRequest(
    paymentInfo: PaymentInfo,
    nonce: bigint,
  ): Promise<{ txHash: `0x${string}` }> {
    return sharedApproveRefundRequest(this.getRefundWriteCtx(), paymentInfo, nonce);
  }

  /** Deny a refund request as the arbiter */
  async denyRefundRequest(
    paymentInfo: PaymentInfo,
    nonce: bigint,
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
    amount?: bigint,
  ): Promise<{ txHash: `0x${string}` }> {
    const refundAmount = amount ?? paymentInfo.maxAmount;

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: "refundInEscrow",
      args: [toAbiPaymentInfo(paymentInfo), refundAmount],
    });

    return { txHash: txHash as `0x${string}` };
  }

  // ============ Batch Operations ============

  /**
   * Approve multiple refund requests in batch
   *
   * @remarks
   * Items are processed sequentially. If one item fails, remaining items continue.
   * Check the `success` field on each result to identify failures.
   *
   * @param items - Array of objects containing paymentInfo and nonce
   * @returns Array of results with success status, txHash (on success), and error (on failure)
   */
  async batchApprove(
    items: Array<{ paymentInfo: PaymentInfo; nonce: bigint }>,
  ): Promise<BatchResult[]> {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const results: BatchResult[] = [];

    for (const { paymentInfo, nonce } of items) {
      try {
        const { txHash } = await this.approveRefundRequest(paymentInfo, nonce);
        results.push({ success: true, txHash });
      } catch (err) {
        results.push({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  /**
   * Deny multiple refund requests in batch
   *
   * @remarks
   * Items are processed sequentially. If one item fails, remaining items continue.
   * Check the `success` field on each result to identify failures.
   *
   * @param items - Array of objects containing paymentInfo and nonce
   * @returns Array of results with success status, txHash (on success), and error (on failure)
   */
  async batchDeny(
    items: Array<{ paymentInfo: PaymentInfo; nonce: bigint }>,
  ): Promise<BatchResult[]> {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const results: BatchResult[] = [];

    for (const { paymentInfo, nonce } of items) {
      try {
        const { txHash } = await this.denyRefundRequest(paymentInfo, nonce);
        results.push({ success: true, txHash });
      } catch (err) {
        results.push({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
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
    receiverAddress?: `0x${string}`,
  ): Promise<{ keys: readonly `0x${string}`[]; total: bigint }> {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const address = receiverAddress ?? this.walletClient.account!.address;

    const [keys, total] = (await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: "getReceiverRefundRequests",
      args: [address, offset, count],
    })) as [readonly `0x${string}`[], bigint];

    return { keys, total };
  }

  /** Get the status of a refund request */
  async getRefundStatus(
    paymentInfo: PaymentInfo,
    nonce: bigint,
  ): Promise<(typeof RequestStatus)[keyof typeof RequestStatus]> {
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
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const address = receiverAddress ?? this.walletClient.account!.address;

    const count = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: "receiverRefundRequestCount",
      args: [address],
    });

    return count as bigint;
  }

  /** Get refund request data by composite key */
  async getRefundRequestByKey(compositeKey: `0x${string}`): Promise<RefundRequestData> {
    return sharedGetRefundRequestByKey(this.getRefundCtx(), compositeKey);
  }

  // ============ Freeze Operations ============

  /** Check if a payment is currently frozen */
  async isFrozen(paymentInfo: PaymentInfo, freezeAddress: `0x${string}`): Promise<boolean> {
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
  watchNewCases(callback: (event: RefundRequestEventLog) => void): {
    unsubscribe: () => void;
  } {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: "RefundRequested",
      onLogs: logs => {
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
  watchDecisions(callback: (event: RefundRequestEventLog) => void): {
    unsubscribe: () => void;
  } {
    if (!this.refundRequestAddress) {
      throw new Error(
        "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
      );
    }

    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      eventName: "RefundRequestStatusUpdated",
      onLogs: logs => {
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
    callback: (event: FreezeEventLog) => void,
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
      throw new Error(
        "ArbiterRegistry address required. Use resolveAddresses(networkId) from @x402r/core to get the registry address for your network.",
      );
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: "register",
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
      throw new Error(
        "ArbiterRegistry address required. Use resolveAddresses(networkId) from @x402r/core to get the registry address for your network.",
      );
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: "updateUri",
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
      throw new Error(
        "ArbiterRegistry address required. Use resolveAddresses(networkId) from @x402r/core to get the registry address for your network.",
      );
    }

    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: "deregister",
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
      throw new Error(
        "ArbiterRegistry address required. Use resolveAddresses(networkId) from @x402r/core to get the registry address for your network.",
      );
    }

    const uri = await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: "getUri",
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
      throw new Error(
        "ArbiterRegistry address required. Use resolveAddresses(networkId) from @x402r/core to get the registry address for your network.",
      );
    }

    const isRegistered = await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: "isRegistered",
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
      throw new Error(
        "ArbiterRegistry address required. Use resolveAddresses(networkId) from @x402r/core to get the registry address for your network.",
      );
    }

    const count = await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: "arbiterCount",
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
      throw new Error(
        "ArbiterRegistry address required. Use resolveAddresses(networkId) from @x402r/core to get the registry address for your network.",
      );
    }

    const [arbiters, uris, total] = (await this.publicClient.readContract({
      address: this.arbiterRegistryAddress,
      abi: ArbiterRegistryABI,
      functionName: "getArbiters",
      args: [offset, count],
    })) as [readonly `0x${string}`[], readonly string[], bigint];

    return { arbiters, uris, total };
  }

  // ============ Evidence Operations ============

  /** Get the evidence read context, throwing if refundRequestEvidenceAddress is not configured */
  private getEvidenceCtx() {
    if (!this.refundRequestEvidenceAddress) {
      throw new Error(
        "RefundRequestEvidence address required. Use resolveAddresses(networkId) from @x402r/core to get the evidence address for your network.",
      );
    }
    return {
      publicClient: this.publicClient,
      refundRequestEvidenceAddress: this.refundRequestEvidenceAddress,
    };
  }

  /** Get the evidence write context, throwing if refundRequestEvidenceAddress is not configured */
  private getEvidenceWriteCtx() {
    if (!this.refundRequestEvidenceAddress) {
      throw new Error(
        "RefundRequestEvidence address required. Use resolveAddresses(networkId) from @x402r/core to get the evidence address for your network.",
      );
    }
    return {
      publicClient: this.publicClient,
      walletClient: this.walletClient,
      refundRequestEvidenceAddress: this.refundRequestEvidenceAddress,
    };
  }

  /**
   * Submit evidence for a dispute as an IPFS CID
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index identifying which charge
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
