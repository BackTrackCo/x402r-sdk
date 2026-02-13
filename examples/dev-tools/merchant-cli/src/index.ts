#!/usr/bin/env node

/**
 * x402r Merchant CLI
 *
 * A command-line tool for merchant operations: releasing funds, managing refunds, etc.
 *
 * Usage:
 *   pnpm start release --payment-json '{"operator":...}' --amount 10000  (or use saved state)
 *   pnpm start approve-refund                                             (reads from saved state)
 *   pnpm start payment-amounts                                            (reads from saved state)
 */

import { Command } from "commander";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { X402rMerchant } from "@x402r/merchant";
import {
  calculateTotalFees,
  formatFeeBreakdown,
  validateFeeBounds,
  type PaymentInfo,
} from "@x402r/core";
import { initCli } from "../../shared/cli-setup.js";
import { getPaymentInfoFromState } from "../../shared/state.js";
import { parsePaymentInfo, formatEvidenceList } from "../../shared/utils.js";
import { showEvidence, submitMerchantEvidence } from "./commands/evidence.js";

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

// Create merchant SDK from shared setup
function createMerchant() {
  const { account, publicClient, walletClient, networkId, networkConfig, operatorAddress } =
    initCli({ requireOperator: true });

  const merchant = new X402rMerchant({
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    escrowAddress: networkConfig.authCaptureEscrow,
    refundRequestAddress: networkConfig.refundRequest,
    refundRequestEvidenceAddress: networkConfig.refundRequestEvidence,
    chainId: 84532,
  });

  return {
    merchant,
    account,
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    networkId,
    networkConfig,
  };
}

// Create CLI
const program = new Command();

program
  .name("x402r-merchant")
  .description("CLI tool for x402r merchant operations")
  .version("0.0.1");

// Info command
program
  .command("info")
  .description("Show merchant configuration info")
  .action(() => {
    const { account, operatorAddress, networkId, networkConfig } = createMerchant();

    console.log("\n=== Merchant Info ===");
    console.log("  Address:", account.address);
    console.log("  Network:", networkId);
    console.log("  RPC:", process.env.RPC_URL || "https://sepolia.base.org");

    console.log("\n=== Operator ===");
    console.log("  Operator:", operatorAddress);

    console.log("\n=== Protocol Addresses ===");
    console.log("  Escrow:", networkConfig.authCaptureEscrow);
    console.log("  RefundRequest:", networkConfig.refundRequest);
    console.log("  USDC:", networkConfig.usdc);
  });

// Release command
program
  .command("release")
  .description("Release funds from escrow to the merchant")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-a, --amount <amount>", "Amount to release (defaults to maxAmount)")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const amount = options.amount ? BigInt(options.amount) : paymentInfo.maxAmount;

    console.log("\nReleasing funds from escrow...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Receiver:", paymentInfo.receiver);
    console.log("  Amount:", amount.toString());

    try {
      const result = await merchant.release(paymentInfo, amount);
      console.log("\nRelease successful!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nRelease failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Payment amounts command
program
  .command("payment-amounts")
  .description("Get capturable and refundable amounts for a payment")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);

    console.log("\nFetching payment amounts...");

    try {
      const amounts = await merchant.getPaymentAmounts(paymentInfo);
      console.log("\n=== Payment Amounts ===");
      console.log("  Capturable:", amounts.capturableAmount.toString(), "(can be released)");
      console.log(
        "  Refundable:",
        amounts.refundableAmount.toString(),
        "(post-escrow refund window)",
      );
    } catch (error) {
      console.error("\nFailed to get amounts:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Refund in escrow command
program
  .command("refund-in-escrow")
  .description("Refund funds that are still in escrow back to the payer")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-a, --amount <amount>", "Amount to refund")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const amount = BigInt(options.amount);

    console.log("\nRefunding funds from escrow...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Amount:", amount.toString());

    try {
      const result = await merchant.refundInEscrow(paymentInfo, amount);
      console.log("\nRefund successful!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nRefund failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Approve refund command
program
  .command("approve-refund")
  .description("Approve a pending refund request")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    console.log("\nApproving refund request...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Nonce:", nonce.toString());

    // Show evidence summary before decision
    try {
      const evidenceCount = await merchant.getEvidenceCount(paymentInfo, nonce);
      if (evidenceCount > 0n) {
        const entries = await merchant.getAllEvidence(paymentInfo, nonce);
        console.log(`\n=== Evidence (${evidenceCount} entries) ===`);
        console.log(formatEvidenceList(entries));
      } else {
        console.log("\n  No evidence submitted");
      }
    } catch {
      // Evidence contract may not be configured — proceed without
    }

    try {
      const result = await merchant.approveRefundRequest(paymentInfo, nonce);
      console.log("\nRefund request approved!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nApproval failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Deny refund command
program
  .command("deny-refund")
  .description("Deny a pending refund request")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    console.log("\nDenying refund request...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Nonce:", nonce.toString());

    // Show evidence summary before decision
    try {
      const evidenceCount = await merchant.getEvidenceCount(paymentInfo, nonce);
      if (evidenceCount > 0n) {
        const entries = await merchant.getAllEvidence(paymentInfo, nonce);
        console.log(`\n=== Evidence (${evidenceCount} entries) ===`);
        console.log(formatEvidenceList(entries));
      } else {
        console.log("\n  No evidence submitted");
      }
    } catch {
      // Evidence contract may not be configured — proceed without
    }

    try {
      const result = await merchant.denyRefundRequest(paymentInfo, nonce);
      console.log("\nRefund request denied!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nDenial failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Check refund status command
program
  .command("refund-status")
  .description("Check the status of a refund request")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    try {
      const hasRequest = await merchant.hasRefundRequest(paymentInfo, nonce);
      if (!hasRequest) {
        console.log("\nNo refund request found for this payment");
        return;
      }

      const status = await merchant.getRefundStatus(paymentInfo, nonce);
      const statusNames = ["Pending", "Approved", "Denied", "Cancelled"];
      console.log(`\nRefund status: ${statusNames[status] || status}`);

      const request = await merchant.getRefundRequest(paymentInfo, nonce);
      console.log("  Amount requested:", request.amount.toString());
    } catch (error) {
      console.error("\nFailed to get status:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Pending refunds command
program
  .command("pending-refunds")
  .description("List pending refund requests for this merchant")
  .option("-o, --offset <offset>", "Starting offset", "0")
  .option("-c, --count <count>", "Number of requests to fetch", "10")
  .action(async options => {
    const { merchant } = createMerchant();
    const offset = BigInt(options.offset);
    const count = BigInt(options.count);

    console.log("\nFetching pending refund requests...");

    try {
      const { keys, total } = await merchant.getPendingRefundRequests(offset, count);
      console.log(`\nFound ${total} total refund requests`);

      if (keys.length === 0) {
        console.log("No pending refund requests");
        return;
      }

      console.log(`\nShowing ${keys.length} requests (offset: ${offset}):`);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const request = await merchant.getRefundRequestByKey(key);
        const statusNames = ["Pending", "Approved", "Denied", "Cancelled"];
        console.log(`\n${Number(offset) + i + 1}. Key: ${key.slice(0, 18)}...`);
        console.log(`   Amount: ${request.amount.toString()}`);
        console.log(`   Status: ${statusNames[request.status] || request.status}`);
      }
    } catch (error) {
      console.error("\nFailed to fetch requests:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Unfreeze command
program
  .command("unfreeze")
  .description("Unfreeze a frozen payment")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-f, --freeze-address <address>", "Freeze contract address")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const freezeAddress = options.freezeAddress as `0x${string}`;

    console.log("\nUnfreezing payment...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Freeze Contract:", freezeAddress);

    try {
      const result = await merchant.unfreezePayment(paymentInfo, freezeAddress);
      console.log("\nPayment unfrozen!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nUnfreeze failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Check frozen status command
program
  .command("is-frozen")
  .description("Check if a payment is frozen")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-f, --freeze-address <address>", "Freeze contract address")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const freezeAddress = options.freezeAddress as `0x${string}`;

    try {
      const isFrozen = await merchant.isFrozen(paymentInfo, freezeAddress);
      console.log(`\nPayment is ${isFrozen ? "FROZEN" : "NOT FROZEN"}`);
    } catch (error) {
      console.error("\nFailed to check status:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============ Evidence Commands ============

// Show evidence command
program
  .command("show-evidence")
  .description("Show all evidence for a dispute")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    try {
      await showEvidence(merchant, paymentInfo, nonce);
    } catch (error) {
      console.error("\nFailed to show evidence:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Submit evidence command
program
  .command("submit-evidence")
  .description("Submit evidence as merchant (receiver role)")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-c, --cid <cid>", "IPFS CID of the evidence")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    try {
      const result = await submitMerchantEvidence(merchant, paymentInfo, nonce, options.cid);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nSubmit evidence failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Operator config command
program
  .command("operator-config")
  .description("Get the full operator configuration")
  .action(async () => {
    const { merchant } = createMerchant();

    console.log("\nFetching operator configuration...");

    try {
      const config = await merchant.getOperatorConfig();
      console.log("\n=== Operator Configuration ===");
      console.log("  Escrow:", config.escrow);
      console.log("  Fee Recipient:", config.feeRecipient);
      console.log("  Fee Calculator:", config.feeCalculator);
      console.log("  Protocol Fee Config:", config.protocolFeeConfig);
      console.log("\n=== Conditions ===");
      console.log("  Authorize:", config.authorizeCondition);
      console.log("  Charge:", config.chargeCondition);
      console.log("  Release:", config.releaseCondition);
      console.log("  Refund In Escrow:", config.refundInEscrowCondition);
      console.log("  Refund Post Escrow:", config.refundPostEscrowCondition);
      console.log("\n=== Recorders ===");
      console.log("  Authorize:", config.authorizeRecorder);
      console.log("  Charge:", config.chargeRecorder);
      console.log("  Release:", config.releaseRecorder);
      console.log("  Refund In Escrow:", config.refundInEscrowRecorder);
      console.log("  Refund Post Escrow:", config.refundPostEscrowRecorder);
    } catch (error) {
      console.error("\nFailed to get config:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Calculate fee command
program
  .command("calculate-fee")
  .description("Calculate fees for a payment amount")
  .requiredOption("-a, --amount <amount>", "Amount to calculate fees for (in token units)")
  .option("-p, --payment-json <json>", "Payment info JSON (optional, for bounds validation)")
  .option("-c, --caller <address>", "Caller address (defaults to merchant address)")
  .action(async options => {
    const { publicClient, account, operatorAddress, networkId } = createMerchant();
    const amount = BigInt(options.amount);
    const caller = (options.caller as `0x${string}`) || account.address;

    // Create a minimal payment info for fee calculation if not provided
    const paymentInfo: PaymentInfo = options.paymentJson
      ? parsePaymentInfo(options.paymentJson)
      : {
          operator: operatorAddress,
          payer: "0x0000000000000000000000000000000000000001",
          receiver: account.address,
          token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
          maxAmount: amount,
          preApprovalExpiry: 0,
          authorizationExpiry: 0,
          refundExpiry: 0,
          minFeeBps: 0,
          maxFeeBps: 10000, // 100%
          feeReceiver: account.address,
          salt: 0n,
        };

    console.log("\nCalculating fees...");
    console.log("  Amount:", amount.toString());
    console.log("  Operator:", operatorAddress);
    console.log("  Caller:", caller);

    try {
      const fees = await calculateTotalFees(
        publicClient,
        operatorAddress,
        paymentInfo,
        amount,
        caller,
      );

      console.log("\n" + formatFeeBreakdown(fees));

      // Validate bounds if payment info was provided
      if (options.paymentJson) {
        const isValid = validateFeeBounds(fees, paymentInfo);
        console.log(
          `\nFee Bounds: ${isValid ? "VALID" : "INVALID"} (min: ${paymentInfo.minFeeBps} bps, max: ${paymentInfo.maxFeeBps} bps)`,
        );
      }
    } catch (error) {
      console.error("\nFailed to calculate fees:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
