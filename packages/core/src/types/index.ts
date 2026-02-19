/**
 * Core types for X402r SDK
 * @module types
 */

import { zeroAddress } from "viem";

/**
 * Payment lifecycle states matching the Solidity enum
 *
 * STATE MACHINE:
 * - NonExistent → InEscrow: authorize()
 * - InEscrow → Released: release() / capture()
 * - InEscrow → Settled: full refundInEscrow(), void(), or reclaim()
 * - InEscrow → Expired: authorizationExpiry passed
 * - Released → Settled: full refundPostEscrow() or refundExpiry passed
 * - Expired → Settled: reclaim() called by payer
 */
export enum PaymentState {
  /** Payment has never been authorized through this operator */
  NonExistent = 0,
  /** Payment authorized, funds locked in escrow (capturableAmount > 0) */
  InEscrow = 1,
  /** Funds released to receiver, may still be refundable (refundableAmount > 0) */
  Released = 2,
  /** Payment settled - no funds in escrow or refundable */
  Settled = 3,
  /** Authorization expired, payer can reclaim via escrow.reclaim() */
  Expired = 4,
}

/**
 * Refund request status matching the Solidity enum
 */
export enum RequestStatus {
  /** Request submitted, awaiting decision */
  Pending = 0,
  /** Request approved by arbiter or receiver */
  Approved = 1,
  /** Request denied by arbiter or receiver */
  Denied = 2,
  /** Request cancelled by payer */
  Cancelled = 3,
}

/**
 * PaymentInfo struct matching the Solidity struct from AuthCaptureEscrow
 *
 * @example
 * ```typescript
 * const paymentInfo: PaymentInfo = {
 *   operator: '0x1234...',
 *   payer: '0x2345...',
 *   receiver: '0x3456...',
 *   token: '0x4567...',
 *   maxAmount: BigInt('1000000'),
 *   preApprovalExpiry: 0n,
 *   authorizationExpiry: BigInt(4294967295),
 *   refundExpiry: BigInt(281474976710655),
 *   minFeeBps: 0,
 *   maxFeeBps: 0,
 *   feeReceiver: '0x5678...',
 *   salt: BigInt('0x123456'),
 * };
 * ```
 */
export interface PaymentInfo {
  /** Address of the operator contract (must match operator that authorized) */
  operator: `0x${string}`;
  /** Address of the payer who authorized the payment */
  payer: `0x${string}`;
  /** Address of the receiver (merchant) */
  receiver: `0x${string}`;
  /** Address of the token being transferred (e.g., USDC) */
  token: `0x${string}`;
  /** Maximum amount authorized (uint120 in Solidity) */
  maxAmount: bigint;
  /** Pre-approval expiry timestamp (uint48 in Solidity, 0n if not used) */
  preApprovalExpiry: bigint;
  /** Authorization expiry timestamp (uint48 in Solidity) */
  authorizationExpiry: bigint;
  /** Refund expiry timestamp (uint48 in Solidity) */
  refundExpiry: bigint;
  /** Minimum fee in basis points (uint16 in Solidity) */
  minFeeBps: number;
  /** Maximum fee in basis points (uint16 in Solidity) */
  maxFeeBps: number;
  /** Address that receives the fee */
  feeReceiver: `0x${string}`;
  /** Unique salt for this payment (uint256 in Solidity) */
  salt: bigint;
}

/**
 * Refund request data matching the Solidity struct
 */
export interface RefundRequestData {
  /** Hash of the PaymentInfo struct */
  paymentInfoHash: `0x${string}`;
  /** Record index this refund is for (nonce from PaymentIndexRecorder) */
  nonce: bigint;
  /** Amount being requested for refund (uint120 in Solidity) */
  amount: bigint;
  /** Current status of the refund request */
  status: RequestStatus;
}

/**
 * Operator configuration - all immutable slots
 */
export interface OperatorConfig {
  /** Core state */
  escrow: `0x${string}`;
  feeRecipient: `0x${string}`;
  feeCalculator: `0x${string}`;
  protocolFeeConfig: `0x${string}`;
  /** Condition slots (address(0) = always allow) */
  authorizeCondition: `0x${string}`;
  chargeCondition: `0x${string}`;
  releaseCondition: `0x${string}`;
  refundInEscrowCondition: `0x${string}`;
  refundPostEscrowCondition: `0x${string}`;
  /** Recorder slots (address(0) = no-op) */
  authorizeRecorder: `0x${string}`;
  chargeRecorder: `0x${string}`;
  releaseRecorder: `0x${string}`;
  refundInEscrowRecorder: `0x${string}`;
  refundPostEscrowRecorder: `0x${string}`;
}

/**
 * Fee structure information
 */
export interface FeeStructure {
  /** Fee calculator contract address */
  feeCalculator: `0x${string}`;
  /** Protocol fee config contract address */
  protocolFeeConfig: `0x${string}`;
  /** Address that receives operator's share of fees */
  feeRecipient: `0x${string}`;
}

// ============ Constants ============

/** Zero address constant for validation */
const ZERO_ADDRESS = zeroAddress;

/** Maximum uint32 value (used for authorizationExpiry) */
export const MAX_UINT32 = 4294967295n;

/** Maximum uint48 value (used for refundExpiry) */
export const MAX_UINT48 = 281474976710655n;

/** Basis points constant (10000 = 100%) */
export const BASIS_POINTS = 10000;

// ============ Validation Functions ============

/**
 * Validates an Ethereum address format
 *
 * @param address - The address to validate
 * @returns true if the address is a valid format
 *
 * @example
 * ```typescript
 * isValidAddress('0x1234567890123456789012345678901234567890'); // true
 * isValidAddress('0x123'); // false
 * ```
 */
export function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates a PaymentInfo object
 *
 * @param paymentInfo - The PaymentInfo to validate
 * @returns true if all required fields are valid
 *
 * @example
 * ```typescript
 * const isValid = isValidPaymentInfo(paymentInfo);
 * if (!isValid) {
 *   throw new Error('Invalid payment info');
 * }
 * ```
 */
export function isValidPaymentInfo(paymentInfo: PaymentInfo): boolean {
  // Check all address fields are valid and non-zero
  if (paymentInfo.operator === ZERO_ADDRESS) return false;
  if (paymentInfo.payer === ZERO_ADDRESS) return false;
  if (paymentInfo.receiver === ZERO_ADDRESS) return false;

  // Check maxAmount is positive
  if (paymentInfo.maxAmount <= 0n) return false;

  // All checks passed
  return true;
}

/**
 * Result from listing arbiters in the registry
 */
export interface ArbiterList {
  /** Array of arbiter addresses */
  arbiters: readonly `0x${string}`[];
  /** Array of corresponding URIs */
  uris: readonly string[];
  /** Total number of registered arbiters */
  total: bigint;
}

// ============ Payment Store ============

/**
 * Interface for persisting PaymentInfo structs locally.
 *
 * Used by X402rClient and X402rMerchant to cache PaymentInfo for fast lookup
 * and to recover full payment details after restart without RPC calls.
 */
export interface PaymentStore {
  /** Persist a PaymentInfo by its hash */
  save(hash: `0x${string}`, paymentInfo: PaymentInfo): Promise<void>;
  /** Load a PaymentInfo by its hash, or null if not found */
  load(hash: `0x${string}`): Promise<PaymentInfo | null>;
  /** List all stored payments where payer matches the given address */
  listByPayer(
    payer: `0x${string}`,
  ): Promise<Array<{ hash: `0x${string}`; paymentInfo: PaymentInfo }>>;
}

// ============ Event Log Types ============

/**
 * Typed event log for PaymentFrozen and PaymentUnfrozen events from the Freeze contract
 */
export interface FreezeEventLog {
  eventName: "PaymentFrozen" | "PaymentUnfrozen";
  args: {
    paymentInfoHash?: `0x${string}`;
    caller?: `0x${string}`;
  };
  address: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

/**
 * Typed event log for RefundRequested, RefundRequestStatusUpdated, and RefundRequestCancelled events
 */
export interface RefundRequestEventLog {
  eventName: "RefundRequested" | "RefundRequestStatusUpdated" | "RefundRequestCancelled";
  args: {
    paymentInfoHash?: `0x${string}`;
    payer?: `0x${string}`;
    receiver?: `0x${string}`;
    amount?: bigint;
    nonce?: bigint;
    status?: number;
  };
  address: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

/**
 * Submitter role in a dispute evidence submission
 */
export enum SubmitterRole {
  /** Payer who initiated the payment */
  Payer = 0,
  /** Receiver (merchant) who received the payment */
  Receiver = 1,
  /** Arbiter resolving the dispute */
  Arbiter = 2,
}

/**
 * Evidence entry submitted to the RefundRequestEvidence contract
 */
export interface Evidence {
  /** Address that submitted this evidence */
  submitter: `0x${string}`;
  /** Role of the submitter (Payer, Receiver, or Arbiter) */
  role: SubmitterRole;
  /** Block timestamp when evidence was submitted */
  timestamp: bigint;
  /** IPFS CID pointing to the evidence content */
  cid: string;
}

/**
 * Typed event log for EvidenceSubmitted events from the RefundRequestEvidence contract
 */
export interface EvidenceEventLog {
  eventName: "EvidenceSubmitted";
  args: {
    paymentInfo?: PaymentInfo;
    nonce?: bigint;
    submitter?: `0x${string}`;
    role?: SubmitterRole;
    cid?: string;
    index?: bigint;
  };
  address: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

// ============ Evidence Content Types ============

/** Evidence submitted by an arbiter with a ruling decision */
export interface ArbiterRulingEvidence {
  type: "arbiter-ruling";
  decision: "approve" | "deny";
  reasoning: string;
  confidence?: number;
  commitment?: string;
  model?: string;
}

/** Evidence submitted by a payer requesting a refund */
export interface PayerRefundEvidence {
  type: "payer-refund-request";
  reason: string;
  description?: string;
}

/** Evidence submitted by a merchant responding to a dispute */
export interface MerchantResponseEvidence {
  type: "merchant-response";
  response: string;
  description?: string;
}

/** Union of all standard evidence content types */
export type EvidenceContent =
  | ArbiterRulingEvidence
  | PayerRefundEvidence
  | MerchantResponseEvidence;

/**
 * Typed event log for PaymentOperator events (ReleaseExecuted, AuthorizationCreated, etc.)
 */
export interface PaymentOperatorEventLog {
  eventName:
    | "ReleaseExecuted"
    | "RefundInEscrowExecuted"
    | "RefundPostEscrowExecuted"
    | "AuthorizationCreated"
    | "ChargeExecuted";
  args: {
    paymentInfoHash?: `0x${string}`;
    payer?: `0x${string}`;
    receiver?: `0x${string}`;
    amount?: bigint;
  };
  address: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}
