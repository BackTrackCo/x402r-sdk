/**
 * X402rMerchant - Merchant SDK for servers using X402r refundable payments
 * @module merchant
 */

import type { PublicClient, WalletClient } from 'viem';
import {
  PaymentOperatorABI,
  AuthCaptureEscrowABI,
  RefundRequestABI,
  EscrowPeriodABI,
  FreezeABI,
  RequestStatus,
  NotImplementedError,
  computePaymentInfoHash,
  type PaymentInfo,
  type PaymentState,
  type OperatorConfig,
  type FeeStructure,
  type RefundRequestData,
} from '@x402r/core';

/**
 * Configuration for X402rMerchant
 */
export interface X402rMerchantConfig {
  /** viem PublicClient for reading contract state */
  publicClient: PublicClient;
  /** viem WalletClient for write operations (required for merchants) */
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
 * Merchant SDK for servers using X402r refundable payments
 *
 * Provides methods for:
 * - Releasing funds from escrow
 * - Processing refunds
 * - Approving/denying refund requests
 * - Managing escrow periods
 * - Subscribing to payment events
 *
 * @example
 * ```typescript
 * import { X402rMerchant } from '@x402r/merchant';
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
 * const merchant = new X402rMerchant({
 *   publicClient,
 *   walletClient,
 *   operatorAddress: '0x...',
 * });
 *
 * // Release funds from escrow
 * const { txHash } = await merchant.release(paymentInfo, amount);
 * ```
 */
export class X402rMerchant {
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

  constructor(config: X402rMerchantConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.operatorAddress = config.operatorAddress;
    this.escrowAddress = config.escrowAddress;
    this.refundRequestAddress = config.refundRequestAddress;
    this.chainId = config.chainId ?? 84532;
  }

  // ============ Payment Queries ============
  // NOTE: Some methods are stubbed for future Graph/indexer integration.
  // The PaymentOperator contract does not store payment listings on-chain.
  // Payment amounts can still be queried from escrow contract.

  /**
   * Get the current state of a payment
   *
   * @param _paymentInfo - The payment information struct
   * @returns The payment state (NonExistent, InEscrow, Released, Settled, Expired)
   * @throws NotImplementedError - This method requires subgraph integration
   *
   * @example
   * ```typescript
   * const state = await merchant.getPaymentState(paymentInfo);
   * if (state === PaymentState.InEscrow) {
   *   console.log('Payment is in escrow, can be released');
   * }
   * ```
   */
  async getPaymentState(_paymentInfo: PaymentInfo): Promise<PaymentState> {
    throw new NotImplementedError('getPaymentState');
  }

  /**
   * Get all payment hashes where the current wallet is the receiver
   *
   * @returns Object with hashes array
   * @throws NotImplementedError - This method requires subgraph integration
   *
   * @example
   * ```typescript
   * const { hashes } = await merchant.getReceiverPayments();
   * for (const hash of hashes) {
   *   console.log(`Payment hash: ${hash}`);
   * }
   * ```
   */
  async getReceiverPayments(): Promise<{ hashes: readonly `0x${string}`[] }> {
    throw new NotImplementedError('getReceiverPayments');
  }

  /**
   * Get the capturable and refundable amounts for a payment
   *
   * @param paymentInfo - The payment information struct
   * @returns Object with capturableAmount and refundableAmount
   * @throws Error if escrowAddress is not configured
   *
   * @example
   * ```typescript
   * const { capturableAmount, refundableAmount } = await merchant.getPaymentAmounts(paymentInfo);
   * console.log(`Can capture: ${capturableAmount}, can refund: ${refundableAmount}`);
   * ```
   */
  async getPaymentAmounts(
    paymentInfo: PaymentInfo
  ): Promise<{ capturableAmount: bigint; refundableAmount: bigint }> {
    if (!this.escrowAddress) {
      throw new Error('Escrow address required');
    }

    const paymentInfoHash = computePaymentInfoHash(
      paymentInfo,
      this.escrowAddress,
      this.chainId
    );

    const state = await this.publicClient.readContract({
      address: this.escrowAddress,
      abi: AuthCaptureEscrowABI,
      functionName: 'paymentState',
      args: [paymentInfoHash],
    });

    const [, capturableAmount, refundableAmount] = state as [boolean, bigint, bigint];

    return { capturableAmount, refundableAmount };
  }

  // ============ Payment Operations ============

  /**
   * Release funds from escrow to the receiver
   *
   * @param paymentInfo - The payment information struct
   * @param amount - Amount to release in token units
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * const { txHash } = await merchant.release(paymentInfo, BigInt('500000'));
   * console.log(`Released funds: ${txHash}`);
   * ```
   */
  async release(
    paymentInfo: PaymentInfo,
    amount: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'release',
      args: [paymentInfo as never, amount],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Refund funds that are still in escrow back to the payer
   *
   * @param paymentInfo - The payment information struct
   * @param amount - Amount to refund in token units
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * const { txHash } = await merchant.refundInEscrow(paymentInfo, BigInt('500000'));
   * console.log(`Refunded: ${txHash}`);
   * ```
   */
  async refundInEscrow(
    paymentInfo: PaymentInfo,
    amount: bigint
  ): Promise<{ txHash: `0x${string}` }> {
    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'refundInEscrow',
      args: [paymentInfo as never, amount],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Charge a payment directly (for non-escrow flows like subscriptions)
   *
   * @param paymentInfo - The payment information struct
   * @param amount - Amount to charge in token units
   * @param tokenCollector - Address of the token collector contract
   * @param collectorData - Data to pass to the token collector
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * const { txHash } = await merchant.charge(
   *   paymentInfo,
   *   BigInt('1000000'),
   *   tokenCollectorAddress,
   *   '0x...'
   * );
   * console.log(`Charged: ${txHash}`);
   * ```
   */
  async charge(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector: `0x${string}`,
    collectorData: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'charge',
      args: [paymentInfo as never, amount, tokenCollector, collectorData],
    });

    return { txHash: txHash as `0x${string}` };
  }

  /**
   * Refund funds that have already been released (post-escrow refund)
   *
   * @param paymentInfo - The payment information struct
   * @param amount - Amount to refund in token units
   * @param tokenCollector - Address of the token collector contract that will source the refund
   * @param collectorData - Data to pass to the token collector (e.g., signatures)
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * const { txHash } = await merchant.refundPostEscrow(
   *   paymentInfo,
   *   BigInt('500000'),
   *   tokenCollectorAddress,
   *   '0x...'
   * );
   * console.log(`Post-escrow refund: ${txHash}`);
   * ```
   */
  async refundPostEscrow(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector: `0x${string}`,
    collectorData: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
    const txHash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account!,
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'refundPostEscrow',
      args: [paymentInfo as never, amount, tokenCollector, collectorData],
    });

    return { txHash: txHash as `0x${string}` };
  }

  // ============ Operator Config ============

  /**
   * Get the full operator configuration (all immutable slots)
   *
   * @returns OperatorConfig object with all slot addresses
   *
   * @example
   * ```typescript
   * const config = await merchant.getOperatorConfig();
   * console.log(`Escrow: ${config.escrow}`);
   * console.log(`Release condition: ${config.releaseCondition}`);
   * ```
   */
  async getOperatorConfig(): Promise<OperatorConfig> {
    const [
      escrow,
      feeRecipient,
      feeCalculator,
      protocolFeeConfig,
      authorizeCondition,
      chargeCondition,
      releaseCondition,
      refundInEscrowCondition,
      refundPostEscrowCondition,
      authorizeRecorder,
      chargeRecorder,
      releaseRecorder,
      refundInEscrowRecorder,
      refundPostEscrowRecorder,
    ] = await Promise.all([
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'ESCROW',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'FEE_RECIPIENT',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'FEE_CALCULATOR',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'PROTOCOL_FEE_CONFIG',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'AUTHORIZE_CONDITION',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'CHARGE_CONDITION',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'RELEASE_CONDITION',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'REFUND_IN_ESCROW_CONDITION',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'REFUND_POST_ESCROW_CONDITION',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'AUTHORIZE_RECORDER',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'CHARGE_RECORDER',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'RELEASE_RECORDER',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'REFUND_IN_ESCROW_RECORDER',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'REFUND_POST_ESCROW_RECORDER',
      }),
    ]);

    return {
      escrow: escrow as `0x${string}`,
      feeRecipient: feeRecipient as `0x${string}`,
      feeCalculator: feeCalculator as `0x${string}`,
      protocolFeeConfig: protocolFeeConfig as `0x${string}`,
      authorizeCondition: authorizeCondition as `0x${string}`,
      chargeCondition: chargeCondition as `0x${string}`,
      releaseCondition: releaseCondition as `0x${string}`,
      refundInEscrowCondition: refundInEscrowCondition as `0x${string}`,
      refundPostEscrowCondition: refundPostEscrowCondition as `0x${string}`,
      authorizeRecorder: authorizeRecorder as `0x${string}`,
      chargeRecorder: chargeRecorder as `0x${string}`,
      releaseRecorder: releaseRecorder as `0x${string}`,
      refundInEscrowRecorder: refundInEscrowRecorder as `0x${string}`,
      refundPostEscrowRecorder: refundPostEscrowRecorder as `0x${string}`,
    };
  }

  /**
   * Get the fee structure for this operator
   *
   * @returns FeeStructure object with fee calculator and recipient addresses
   *
   * @example
   * ```typescript
   * const fees = await merchant.getFeeStructure();
   * console.log(`Fee calculator: ${fees.feeCalculator}`);
   * console.log(`Fee recipient: ${fees.feeRecipient}`);
   * ```
   */
  async getFeeStructure(): Promise<FeeStructure> {
    const [feeCalculator, protocolFeeConfig, feeRecipient] = await Promise.all([
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'FEE_CALCULATOR',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'PROTOCOL_FEE_CONFIG',
      }),
      this.publicClient.readContract({
        address: this.operatorAddress,
        abi: PaymentOperatorABI,
        functionName: 'FEE_RECIPIENT',
      }),
    ]);

    return {
      feeCalculator: feeCalculator as `0x${string}`,
      protocolFeeConfig: protocolFeeConfig as `0x${string}`,
      feeRecipient: feeRecipient as `0x${string}`,
    };
  }

  /**
   * Get the release condition address for this operator
   *
   * @returns The release condition contract address (address(0) = always allow)
   *
   * @example
   * ```typescript
   * const releaseCondition = await merchant.getReleaseConditions();
   * if (releaseCondition === '0x0000000000000000000000000000000000000000') {
   *   console.log('No release conditions - always allowed');
   * }
   * ```
   */
  async getReleaseConditions(): Promise<`0x${string}`> {
    const releaseCondition = await this.publicClient.readContract({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      functionName: 'RELEASE_CONDITION',
    });

    return releaseCondition as `0x${string}`;
  }

  // ============ Refund Handling ============

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
   * const hasRequest = await merchant.hasRefundRequest(paymentInfo, 0n);
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
   * const status = await merchant.getRefundStatus(paymentInfo, 0n);
   * if (status === RequestStatus.Pending) {
   *   console.log('Refund request is pending');
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
   * Get the full refund request data
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns The full refund request data including amount and status
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const request = await merchant.getRefundRequest(paymentInfo, 0n);
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
   * Approve a refund request
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns Transaction hash
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await merchant.approveRefundRequest(paymentInfo, 0n);
   * console.log(`Refund approved: ${txHash}`);
   * ```
   */
  async approveRefundRequest(
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
   * Deny a refund request
   *
   * @param paymentInfo - The payment information struct
   * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
   * @returns Transaction hash
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { txHash } = await merchant.denyRefundRequest(paymentInfo, 0n);
   * console.log(`Refund denied: ${txHash}`);
   * ```
   */
  async denyRefundRequest(
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
   * Get paginated refund request keys for the current receiver
   *
   * @param offset - Starting index (0-based)
   * @param count - Number of keys to return
   * @returns Object with keys array and total count
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { keys, total } = await merchant.getPendingRefundRequests(0n, 10n);
   * console.log(`Found ${total} refund requests, showing first ${keys.length}`);
   * ```
   */
  async getPendingRefundRequests(
    offset: bigint,
    count: bigint
  ): Promise<{ keys: readonly `0x${string}`[]; total: bigint }> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const [keys, total] = (await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'getReceiverRefundRequests',
      args: [this.walletClient.account!.address, offset, count],
    })) as [readonly `0x${string}`[], bigint];

    return { keys, total };
  }

  /**
   * Get the total count of refund requests for the current receiver
   *
   * @returns Total number of refund requests
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const count = await merchant.getRefundRequestCount();
   * console.log(`Total refund requests: ${count}`);
   * ```
   */
  async getRefundRequestCount(): Promise<bigint> {
    if (!this.refundRequestAddress) {
      throw new Error('RefundRequest address required');
    }

    const count = await this.publicClient.readContract({
      address: this.refundRequestAddress,
      abi: RefundRequestABI,
      functionName: 'receiverRefundRequestCount',
      args: [this.walletClient.account!.address],
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
   * const request = await merchant.getRefundRequestByKey(compositeKey);
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

  // ============ Freeze Management ============

  /**
   * Unfreeze a payment that was previously frozen
   *
   * @param paymentInfo - The payment information struct
   * @param freezeAddress - The Freeze contract address
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * const { txHash } = await merchant.unfreezePayment(paymentInfo, freezeAddress);
   * console.log(`Payment unfrozen: ${txHash}`);
   * ```
   */
  async unfreezePayment(
    paymentInfo: PaymentInfo,
    freezeAddress: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
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
   * @returns True if the payment is frozen
   *
   * @example
   * ```typescript
   * const frozen = await merchant.isFrozen(paymentInfo, freezeAddress);
   * if (frozen) {
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

  // ============ Subscriptions ============

  /**
   * Watch for new refund requests where the current wallet is the receiver
   *
   * @param callback - Function to call when a refund request event is received
   * @returns Object with unsubscribe function
   * @throws Error if refundRequestAddress is not configured
   *
   * @example
   * ```typescript
   * const { unsubscribe } = merchant.watchRefundRequests((event) => {
   *   console.log('New refund request:', event);
   * });
   *
   * // Later: stop watching
   * unsubscribe();
   * ```
   */
  watchRefundRequests(callback: (event: unknown) => void): { unsubscribe: () => void } {
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
   * Watch for release events on the operator
   *
   * @param callback - Function to call when a release event is received
   * @returns Object with unsubscribe function
   *
   * @example
   * ```typescript
   * const { unsubscribe } = merchant.watchReleases((event) => {
   *   console.log('Release executed:', event);
   * });
   *
   * // Later: stop watching
   * unsubscribe();
   * ```
   */
  watchReleases(callback: (event: unknown) => void): { unsubscribe: () => void } {
    const unsubscribe = this.publicClient.watchContractEvent({
      address: this.operatorAddress,
      abi: PaymentOperatorABI,
      eventName: 'ReleaseExecuted',
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
   * const { unsubscribe } = merchant.watchFreezeEvents(freezeAddress, (event) => {
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
