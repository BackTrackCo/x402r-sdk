/**
 * Shared evidence operations used by client, merchant, and arbiter packages
 * @module shared/evidence-operations
 */

import type { PublicClient, WalletClient } from "viem";
import { refundRequestEvidenceAbi } from "../abis/index.js";
import type { SubmitterRole, PaymentInfo, Evidence, EvidenceEventLog } from "../types/index.js";
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
    abi: refundRequestEvidenceAbi,
    functionName: "submitEvidence",
    args: [toAbiPaymentInfo(paymentInfo), nonce, cid],
  });

  return { txHash };
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
    abi: refundRequestEvidenceAbi,
    functionName: "getEvidence",
    args: [toAbiPaymentInfo(paymentInfo), nonce, index],
  });

  return {
    submitter: result.submitter,
    role: result.role as SubmitterRole,
    timestamp: BigInt(result.timestamp),
    cid: result.cid,
  };
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
    abi: refundRequestEvidenceAbi,
    functionName: "getEvidenceCount",
    args: [toAbiPaymentInfo(paymentInfo), nonce],
  });

  return count;
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
  const [rawEntries, total] = await ctx.publicClient.readContract({
    address: ctx.refundRequestEvidenceAddress,
    abi: refundRequestEvidenceAbi,
    functionName: "getEvidenceBatch",
    args: [toAbiPaymentInfo(paymentInfo), nonce, offset, count],
  });

  const entries: Evidence[] = rawEntries.map(e => ({
    submitter: e.submitter,
    role: e.role as SubmitterRole,
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
 * Resolve evidence content from an inline JSON string or an IPFS CID.
 *
 * Evidence entries store a `cid` field that may contain either:
 * 1. Inline JSON (a stringified JSON object) — returned directly after parsing
 * 2. An IPFS CID — fetched from the gateway and returned as parsed JSON
 *
 * @param cid - The evidence CID field value (inline JSON or IPFS CID)
 * @param options - Optional gateway URL and custom fetch function
 * @returns The parsed evidence content
 * @throws Error if the content cannot be parsed or fetched
 */
export async function resolveEvidenceContent(
  cid: string,
  options?: { gateway?: string; fetchFn?: typeof fetch },
): Promise<Record<string, unknown>> {
  // Try inline JSON first
  try {
    const parsed = JSON.parse(cid);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Not inline JSON — treat as IPFS CID
  }

  const gateway = options?.gateway ?? "https://ipfs.io/ipfs/";
  const fetchFn = options?.fetchFn ?? fetch;
  const url = `${gateway}${cid}`;

  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch evidence from IPFS: ${response.status} ${response.statusText}`,
    );
  }

  const content = await response.json();
  return content as Record<string, unknown>;
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
    abi: refundRequestEvidenceAbi,
    eventName: "EvidenceSubmitted",
    onLogs: logs => {
      for (const log of logs) {
        callback(log as unknown as EvidenceEventLog);
      }
    },
  });

  return { unsubscribe };
}
