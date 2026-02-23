/**
 * Shared refund operations used by client, merchant, and arbiter packages
 * @module shared/refund-operations
 */

import type { PublicClient, WalletClient } from "viem";
import { refundRequestAbi } from "../abis/index.js";
import { RequestStatus, type PaymentInfo, type RefundRequestData } from "../types/index.js";
import { toAbiPaymentInfo } from "../utils/index.js";
import { requireAccount } from "./require-account.js";

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
  const exists = await ctx.publicClient.readContract({
    address: ctx.refundRequestAddress,
    abi: refundRequestAbi,
    functionName: "hasRefundRequest",
    args: [toAbiPaymentInfo(paymentInfo), nonce],
  });

  return exists;
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
  const result = await ctx.publicClient.readContract({
    address: ctx.refundRequestAddress,
    abi: refundRequestAbi,
    functionName: "getRefundRequest",
    args: [toAbiPaymentInfo(paymentInfo), nonce],
  });

  return {
    paymentInfoHash: result.paymentInfoHash,
    nonce: result.nonce,
    amount: result.amount,
    status: result.status as RequestStatus,
  };
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
    abi: refundRequestAbi,
    functionName: "getRefundRequestStatus",
    args: [toAbiPaymentInfo(paymentInfo), nonce],
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
  const result = await ctx.publicClient.readContract({
    address: ctx.refundRequestAddress,
    abi: refundRequestAbi,
    functionName: "getRefundRequestByKey",
    args: [compositeKey],
  });

  return {
    paymentInfoHash: result.paymentInfoHash,
    nonce: result.nonce,
    amount: result.amount,
    status: result.status as RequestStatus,
  };
}

/**
 * Batch-fetch refund request data for multiple composite keys.
 *
 * Processes keys in concurrent chunks using `Promise.allSettled` on
 * the existing `getRefundRequestByKey` function.
 *
 * @param ctx - Read context with publicClient and refundRequestAddress
 * @param keys - Array of composite keys to fetch
 * @param options - Optional concurrency limit (default: 10)
 * @returns Array of results with key, data (on success), and error (on failure)
 */
export async function getRefundRequestsByKeys(
  ctx: RefundReadContext,
  keys: readonly `0x${string}`[],
  options?: { concurrency?: number },
): Promise<Array<{ key: `0x${string}`; data?: RefundRequestData; error?: string }>> {
  const concurrency = options?.concurrency ?? 10;
  const results: Array<{ key: `0x${string}`; data?: RefundRequestData; error?: string }> = [];

  for (let i = 0; i < keys.length; i += concurrency) {
    const chunk = keys.slice(i, i + concurrency);
    const settled = await Promise.allSettled(chunk.map(key => getRefundRequestByKey(ctx, key)));

    for (let j = 0; j < chunk.length; j++) {
      const result = settled[j];
      if (result.status === "fulfilled") {
        results.push({ key: chunk[j], data: result.value });
      } else {
        results.push({
          key: chunk[j],
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }
  }

  return results;
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
    abi: refundRequestAbi,
    functionName: "updateStatus",
    args: [toAbiPaymentInfo(paymentInfo), nonce, RequestStatus.Approved],
  });

  return { txHash };
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
    abi: refundRequestAbi,
    functionName: "updateStatus",
    args: [toAbiPaymentInfo(paymentInfo), nonce, RequestStatus.Denied],
  });

  return { txHash };
}
