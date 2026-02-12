/**
 * Evidence Commands for Merchant CLI
 * Submit and view dispute evidence
 */

import type { X402rMerchant } from "@x402r/merchant";
import type { PaymentInfo } from "@x402r/core";
import { formatEvidenceList } from "../../../shared/utils.js";

/**
 * Show all evidence for a payment+nonce
 */
export async function showEvidence(
  merchant: X402rMerchant,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<void> {
  const count = await merchant.getEvidenceCount(paymentInfo, nonce);
  console.log(`\nEvidence count: ${count}`);

  if (count === 0n) {
    console.log("  No evidence submitted");
    return;
  }

  const entries = await merchant.getAllEvidence(paymentInfo, nonce);
  console.log("\n=== Evidence Entries ===");
  console.log(formatEvidenceList(entries));
}

/**
 * Submit evidence as merchant (receiver role)
 */
export async function submitMerchantEvidence(
  merchant: X402rMerchant,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cid: string,
): Promise<{ txHash: `0x${string}` }> {
  console.log("\nSubmitting merchant evidence...");
  console.log("  CID:", cid);
  console.log("  Nonce:", nonce.toString());

  const result = await merchant.submitEvidence(paymentInfo, nonce, cid);
  console.log("\nEvidence submitted!");
  console.log("  Transaction:", result.txHash);

  return result;
}
