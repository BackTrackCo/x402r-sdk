/**
 * Shared refund operations used by client, merchant, and arbiter packages
 * @module shared/refund-operations
 */

import type { PublicClient, WalletClient } from "viem";
import { RefundRequestABI } from "../abis/index.js";
import {
  RequestStatus,
  type PaymentInfo,
  type RefundRequestData,
} from "../types/index.js";

/** Read-only context for refund operations */
export interface RefundReadContext {
  publicClient: PublicClient;
  refundRequestAddress: `0x${string}`;
}

/** Read-write context for refund operations */
export interface RefundWriteContext extends RefundReadContext {
  walletClient: WalletClient;
}

/**
 * Asserts that a WalletClient has an account attached.
 * Throws a descriptive error if the account is missing, which can happen when
 * a WalletClient is created without passing an account (e.g., for browser wallet integration).
 */
function requireAccount(
  walletClient: WalletClient,
): asserts walletClient is WalletClient & {
  account: NonNullable<WalletClient["account"]>;
} {
  if (!walletClient.account) {
    throw new Error(
      "WalletClient must have an account. Pass an account when creating the WalletClient: " +
        "createWalletClient({ account, chain, transport })",
    );
  }
}

/**
 * Check if a refund request exists for a payment
 *
 * @param ctx - Read context with publicClient and refundRequestAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @returns True if a refund request exists
 */
export async function hasRefundRequest(
  ctx: RefundReadContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<boolean> {
  // Cast paymentInfo as never because viem's strict ABI typing cannot infer
  // the complex PaymentInfo struct tuple type from our interface definition.
  const exists = await ctx.publicClient.readContract({
    address: ctx.refundRequestAddress,
    abi: RefundRequestABI,
    functionName: "hasRefundRequest",
    args: [paymentInfo as never, nonce],
  });

  return exists as boolean;
}

/**
 * Get the full refund request data
 *
 * @param ctx - Read context with publicClient and refundRequestAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @returns The full refund request data including amount and status
 */
export async function getRefundRequest(
  ctx: RefundReadContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<RefundRequestData> {
  const request = await ctx.publicClient.readContract({
    address: ctx.refundRequestAddress,
    abi: RefundRequestABI,
    functionName: "getRefundRequest",
    args: [paymentInfo as never, nonce],
  });

  // The contract returns a tuple that matches RefundRequestData fields.
  // viem infers the return as a generic tuple type, so we cast through unknown.
  return request as unknown as RefundRequestData;
}

/**
 * Get the status of a refund request
 *
 * @param ctx - Read context with publicClient and refundRequestAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @returns The refund request status (Pending, Approved, Denied, Cancelled)
 */
export async function getRefundStatus(
  ctx: RefundReadContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<RequestStatus> {
  const status = await ctx.publicClient.readContract({
    address: ctx.refundRequestAddress,
    abi: RefundRequestABI,
    functionName: "getRefundRequestStatus",
    args: [paymentInfo as never, nonce],
  });

  return status as RequestStatus;
}

/**
 * Get refund request data by composite key
 *
 * @param ctx - Read context with publicClient and refundRequestAddress
 * @param compositeKey - The keccak256(paymentInfoHash, nonce) key
 * @returns The refund request data
 */
export async function getRefundRequestByKey(
  ctx: RefundReadContext,
  compositeKey: `0x${string}`,
): Promise<RefundRequestData> {
  const request = await ctx.publicClient.readContract({
    address: ctx.refundRequestAddress,
    abi: RefundRequestABI,
    functionName: "getRefundRequestByKey",
    args: [compositeKey],
  });

  return request as unknown as RefundRequestData;
}

/**
 * Approve a refund request
 *
 * @param ctx - Write context with publicClient, walletClient, and refundRequestAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @returns Transaction hash
 */
export async function approveRefundRequest(
  ctx: RefundWriteContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<{ txHash: `0x${string}` }> {
  requireAccount(ctx.walletClient);

  const txHash = await ctx.walletClient.writeContract({
    chain: ctx.walletClient.chain,
    account: ctx.walletClient.account,
    address: ctx.refundRequestAddress,
    abi: RefundRequestABI,
    functionName: "updateStatus",
    args: [paymentInfo as never, nonce, RequestStatus.Approved],
  });

  return { txHash: txHash as `0x${string}` };
}

/**
 * Deny a refund request
 *
 * @param ctx - Write context with publicClient, walletClient, and refundRequestAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @returns Transaction hash
 */
export async function denyRefundRequest(
  ctx: RefundWriteContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<{ txHash: `0x${string}` }> {
  requireAccount(ctx.walletClient);

  const txHash = await ctx.walletClient.writeContract({
    chain: ctx.walletClient.chain,
    account: ctx.walletClient.account,
    address: ctx.refundRequestAddress,
    abi: RefundRequestABI,
    functionName: "updateStatus",
    args: [paymentInfo as never, nonce, RequestStatus.Denied],
  });

  return { txHash: txHash as `0x${string}` };
}
