/**
 * Evidence Commands for Arbiter CLI
 * View and submit dispute evidence
 */

import type { X402rArbiter } from "@x402r/arbiter";
import type { PaymentInfo } from "@x402r/core";
import { formatEvidenceList } from "../../../shared/utils.js";

/**
 * Show all evidence for a payment+nonce
 */
export async function showEvidence(
  arbiter: X402rArbiter,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<void> {
  const count = await arbiter.getEvidenceCount(paymentInfo, nonce);
  console.log(`\nEvidence count: ${count}`);

  if (count === 0n) {
    console.log("  No evidence submitted");
    return;
  }

  const entries = await arbiter.getAllEvidence(paymentInfo, nonce);
  console.log("\n=== Evidence Entries ===");
  console.log(formatEvidenceList(entries));
}

/**
 * Submit evidence as arbiter
 */
export async function submitArbiterEvidence(
  arbiter: X402rArbiter,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cid: string,
): Promise<{ txHash: `0x${string}` }> {
  console.log("\nSubmitting arbiter evidence...");
  console.log("  CID:", cid);
  console.log("  Nonce:", nonce.toString());

  const result = await arbiter.submitEvidence(paymentInfo, nonce, cid);
  console.log("\nEvidence submitted!");
  console.log("  Transaction:", result.txHash);

  return result;
}
