/**
 * Shared evidence operations used by client, merchant, and arbiter packages
 * @module shared/evidence-operations
 */

import type { PublicClient, WalletClient } from "viem";
import { RefundRequestEvidenceABI } from "../abis/index.js";
import type { PaymentInfo, Evidence, EvidenceEventLog } from "../types/index.js";
import { toAbiPaymentInfo } from "../utils/index.js";
import { requireAccount } from "./require-account.js";

/** Read-only context for evidence operations */
export interface EvidenceReadContext {
  publicClient: PublicClient;
  refundRequestEvidenceAddress: `0x${string}`;
}

/** Read-write context for evidence operations */
export interface EvidenceWriteContext extends EvidenceReadContext {
  walletClient: WalletClient;
}

/**
 * Submit evidence for a dispute as an IPFS CID
 *
 * @param ctx - Write context with publicClient, walletClient, and refundRequestEvidenceAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @param cid - IPFS CID pointing to the evidence content
 * @returns Transaction hash
 */
export async function submitEvidence(
  ctx: EvidenceWriteContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cid: string,
): Promise<{ txHash: `0x${string}` }> {
  requireAccount(ctx.walletClient);

  const txHash = await ctx.walletClient.writeContract({
    chain: ctx.walletClient.chain,
    account: ctx.walletClient.account,
    address: ctx.refundRequestEvidenceAddress,
    abi: RefundRequestEvidenceABI,
    functionName: "submitEvidence",
    args: [toAbiPaymentInfo(paymentInfo), nonce, cid],
  });

  return { txHash: txHash as `0x${string}` };
}

/**
 * Get a single evidence entry by index
 *
 * @param ctx - Read context with publicClient and refundRequestEvidenceAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @param index - The evidence entry index (0-based)
 * @returns The evidence entry
 */
export async function getEvidence(
  ctx: EvidenceReadContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  index: bigint,
): Promise<Evidence> {
  const result = await ctx.publicClient.readContract({
    address: ctx.refundRequestEvidenceAddress,
    abi: RefundRequestEvidenceABI,
    functionName: "getEvidence",
    args: [toAbiPaymentInfo(paymentInfo), nonce, index],
  });

  const [submitter, role, timestamp, cid] = result as unknown as [
    `0x${string}`,
    number,
    bigint,
    string,
  ];

  return { submitter, role, timestamp: BigInt(timestamp), cid };
}

/**
 * Get the total number of evidence entries for a payment+nonce
 *
 * @param ctx - Read context with publicClient and refundRequestEvidenceAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @returns The count of evidence entries
 */
export async function getEvidenceCount(
  ctx: EvidenceReadContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<bigint> {
  const count = await ctx.publicClient.readContract({
    address: ctx.refundRequestEvidenceAddress,
    abi: RefundRequestEvidenceABI,
    functionName: "getEvidenceCount",
    args: [toAbiPaymentInfo(paymentInfo), nonce],
  });

  return count as bigint;
}

/**
 * Get a batch of evidence entries with pagination
 *
 * @param ctx - Read context with publicClient and refundRequestEvidenceAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @param offset - Starting index (0-based)
 * @param count - Number of entries to return
 * @returns Object with entries array and total count
 */
export async function getEvidenceBatch(
  ctx: EvidenceReadContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  offset: bigint,
  count: bigint,
): Promise<{ entries: Evidence[]; total: bigint }> {
  const result = await ctx.publicClient.readContract({
    address: ctx.refundRequestEvidenceAddress,
    abi: RefundRequestEvidenceABI,
    functionName: "getEvidenceBatch",
    args: [toAbiPaymentInfo(paymentInfo), nonce, offset, count],
  });

  const [rawEntries, total] = result as unknown as [
    readonly { submitter: `0x${string}`; role: number; timestamp: number | bigint; cid: string }[],
    bigint,
  ];

  const entries: Evidence[] = rawEntries.map(e => ({
    submitter: e.submitter,
    role: e.role,
    timestamp: BigInt(e.timestamp),
    cid: e.cid,
  }));

  return { entries, total };
}

/**
 * Get all evidence entries for a payment+nonce (convenience wrapper)
 *
 * Fetches the count first, then batch-reads all entries in a single call.
 *
 * @param ctx - Read context with publicClient and refundRequestEvidenceAddress
 * @param paymentInfo - The payment information struct
 * @param nonce - The record index (from PaymentIndexRecorder) identifying which charge
 * @returns Array of all evidence entries
 */
export async function getAllEvidence(
  ctx: EvidenceReadContext,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<Evidence[]> {
  const count = await getEvidenceCount(ctx, paymentInfo, nonce);

  if (count === 0n) {
    return [];
  }

  const { entries } = await getEvidenceBatch(ctx, paymentInfo, nonce, 0n, count);
  return entries;
}

/**
 * Watch for new evidence submissions
 *
 * @param ctx - Read context with publicClient and refundRequestEvidenceAddress
 * @param callback - Callback function called when evidence is submitted
 * @returns Object with unsubscribe function
 */
export function watchEvidenceSubmissions(
  ctx: EvidenceReadContext,
  callback: (event: EvidenceEventLog) => void,
): { unsubscribe: () => void } {
  const unsubscribe = ctx.publicClient.watchContractEvent({
    address: ctx.refundRequestEvidenceAddress,
    abi: RefundRequestEvidenceABI,
    eventName: "EvidenceSubmitted",
    onLogs: logs => {
      for (const log of logs) {
        callback(log as unknown as EvidenceEventLog);
      }
    },
  });

  return { unsubscribe };
}
