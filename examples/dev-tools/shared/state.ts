/**
 * Payment state file — saves the last payment to ~/.x402r/last-payment.json
 * so subsequent CLI commands don't require pasting 4KB+ JSON.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { PaymentInfo } from "@x402r/core";
import { parsePaymentInfo } from "./utils.js";

export interface PaymentState {
  paymentInfo: PaymentInfo;
  operatorAddress: string;
  paymentHash: string;
  timestamp: string;
  networkId: string;
}

const STATE_DIR = path.join(os.homedir(), ".x402r");
const STATE_FILE = path.join(STATE_DIR, "last-payment.json");

/**
 * Save payment state to ~/.x402r/last-payment.json
 */
export function savePaymentState(state: PaymentState): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  // Serialize bigint fields as strings for JSON
  const serializable = {
    ...state,
    paymentInfo: {
      ...state.paymentInfo,
      maxAmount: state.paymentInfo.maxAmount.toString(),
      preApprovalExpiry: state.paymentInfo.preApprovalExpiry.toString(),
      authorizationExpiry: state.paymentInfo.authorizationExpiry.toString(),
      refundExpiry: state.paymentInfo.refundExpiry.toString(),
      salt: state.paymentInfo.salt.toString(),
    },
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(serializable, null, 2));
}

/**
 * Load payment state from ~/.x402r/last-payment.json
 */
export function loadPaymentState(): PaymentState | null {
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return {
      ...raw,
      paymentInfo: {
        ...raw.paymentInfo,
        maxAmount: BigInt(raw.paymentInfo.maxAmount),
        preApprovalExpiry: BigInt(raw.paymentInfo.preApprovalExpiry),
        authorizationExpiry: BigInt(raw.paymentInfo.authorizationExpiry),
        refundExpiry: BigInt(raw.paymentInfo.refundExpiry),
        salt: BigInt(raw.paymentInfo.salt),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Clear the saved payment state
 */
export function clearPaymentState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

/**
 * Get PaymentInfo from CLI options: uses --payment-json if provided, falls back to state file.
 * Exits with error if neither is available.
 */
export function getPaymentInfoFromState(cliOptions: { paymentJson?: string }): PaymentInfo {
  if (cliOptions.paymentJson) {
    return parsePaymentInfo(cliOptions.paymentJson);
  }

  const state = loadPaymentState();
  if (state) {
    console.log(`  (Using saved payment from ${state.timestamp})`);
    return state.paymentInfo;
  }

  console.error("Error: No --payment-json provided and no saved payment state found.");
  console.error("Run 'pay' first, or provide --payment-json explicitly.");
  process.exit(1);
}

/**
 * Print saved state summary
 */
export function printPaymentState(): void {
  const state = loadPaymentState();
  if (!state) {
    console.log("\nNo saved payment state.");
    console.log(`  State file: ${STATE_FILE}`);
    return;
  }

  console.log("\n=== Saved Payment State ===");
  console.log("  Payment Hash:", state.paymentHash);
  console.log("  Operator:", state.operatorAddress);
  console.log("  Network:", state.networkId);
  console.log("  Saved At:", state.timestamp);
  console.log("  Payer:", state.paymentInfo.payer);
  console.log("  Receiver:", state.paymentInfo.receiver);
  console.log("  Amount:", state.paymentInfo.maxAmount.toString());
  console.log(`\n  State file: ${STATE_FILE}`);
}
