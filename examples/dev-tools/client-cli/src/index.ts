#!/usr/bin/env node

/**
 * x402r Client CLI
 *
 * A command-line tool for making x402r payments, freezing payments, and requesting refunds.
 *
 * Usage:
 *   pnpm start pay --url http://localhost:3000/weather
 *   pnpm start freeze --payment-json '{"operator":...}'  (or use saved state)
 *   pnpm start refund --amount 10000                      (reads from saved state)
 */

import { Command } from "commander";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  getNetworkConfig,
  calculateTotalFees,
  formatFeeBreakdown,
  validateFeeBounds,
  type PaymentInfo,
} from "@x402r/core";
import { initCli } from "../../shared/cli-setup.js";
import {
  getPaymentInfoFromState,
  savePaymentState,
  printPaymentState,
  clearPaymentState,
} from "../../shared/state.js";
import { parsePaymentInfo } from "../../shared/utils.js";
import { pay } from "./commands/pay.js";
import { freeze, unfreeze, checkFrozen } from "./commands/freeze.js";
import { requestRefund, cancelRefund, getRefundStatus } from "./commands/refund.js";
import { submitEvidence, listEvidence } from "./commands/evidence.js";

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

// Create CLI
const program = new Command();

program.name("x402r-client").description("CLI tool for x402r payments").version("0.0.1");

// Pay command
program
  .command("pay")
  .description("Make a payment to a URL that returns 402")
  .requiredOption("-u, --url <url>", "URL to pay for")
  .action(async options => {
    const { walletClient, networkId, operatorAddress } = initCli();

    const result = await pay({
      url: options.url,
      walletClient,
    });

    if (result.success) {
      console.log("\n=== Response ===");
      console.log(JSON.stringify(result.response, null, 2));

      if (result.paymentInfo) {
        const paymentInfo = result.paymentInfo as PaymentInfo;
        console.log("\n=== Payment Info (save for freeze/refund) ===");
        console.log(
          JSON.stringify(
            result.paymentInfo,
            (_, v) => (typeof v === "bigint" ? v.toString() : v),
            2,
          ),
        );

        // Auto-save state for subsequent commands
        const paymentOperator = paymentInfo.operator;
        savePaymentState({
          paymentInfo,
          operatorAddress: operatorAddress || paymentOperator,
          paymentHash: result.transaction || "unknown",
          timestamp: new Date().toISOString(),
          networkId,
        });
        console.log("\n  State saved to ~/.x402r/last-payment.json");
      }

      if (result.transaction) {
        console.log("\n=== Transaction ===");
        console.log(`https://sepolia.basescan.org/tx/${result.transaction}`);
      }
    } else {
      console.error("\nPayment failed:", result.error);
      process.exit(1);
    }
  });

// State command
program
  .command("state")
  .description("Show or clear saved payment state")
  .option("--clear", "Clear saved payment state")
  .action(options => {
    if (options.clear) {
      clearPaymentState();
      console.log("Payment state cleared.");
    } else {
      printPaymentState();
    }
  });

// Freeze command
program
  .command("freeze")
  .description("Freeze a payment to extend escrow period")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-f, --freeze-address <address>", "Freeze contract address")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .action(async options => {
    const { publicClient, walletClient } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);

    const result = await freeze({
      paymentInfo,
      freezeAddress: options.freezeAddress as `0x${string}`,
      operatorAddress: options.operatorAddress as `0x${string}`,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.error("\nFreeze failed:", result.error);
      process.exit(1);
    }
  });

// Unfreeze command
program
  .command("unfreeze")
  .description("Unfreeze a previously frozen payment")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-f, --freeze-address <address>", "Freeze contract address")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .action(async options => {
    const { publicClient, walletClient } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);

    const result = await unfreeze({
      paymentInfo,
      freezeAddress: options.freezeAddress as `0x${string}`,
      operatorAddress: options.operatorAddress as `0x${string}`,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.error("\nUnfreeze failed:", result.error);
      process.exit(1);
    }
  });

// Check frozen status command
program
  .command("is-frozen")
  .description("Check if a payment is frozen")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-f, --freeze-address <address>", "Freeze contract address")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .action(async options => {
    const { publicClient } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);

    const isFrozen = await checkFrozen({
      paymentInfo,
      freezeAddress: options.freezeAddress as `0x${string}`,
      operatorAddress: options.operatorAddress as `0x${string}`,
      publicClient,
    });

    console.log(`\nPayment is ${isFrozen ? "FROZEN" : "NOT FROZEN"}`);
  });

// Refund command
program
  .command("refund")
  .description("Request a refund for a payment")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-a, --amount <amount>", "Amount to refund (in token units)")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { publicClient, walletClient, networkId } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);
    const networkConfig = getNetworkConfig(networkId)!;

    const result = await requestRefund({
      paymentInfo,
      amount: BigInt(options.amount),
      nonce: BigInt(options.nonce),
      operatorAddress: options.operatorAddress as `0x${string}`,
      refundRequestAddress: networkConfig.refundRequest,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
      if (result.status !== undefined) {
        console.log("\nCurrent status:", result.status);
      }
    } else {
      console.error("\nRefund request failed:", result.error);
      process.exit(1);
    }
  });

// Cancel refund command
program
  .command("cancel-refund")
  .description("Cancel a pending refund request")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { publicClient, walletClient, networkId } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);
    const networkConfig = getNetworkConfig(networkId)!;

    const result = await cancelRefund({
      paymentInfo,
      nonce: BigInt(options.nonce),
      operatorAddress: options.operatorAddress as `0x${string}`,
      refundRequestAddress: networkConfig.refundRequest,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.error("\nCancel refund failed:", result.error);
      process.exit(1);
    }
  });

// Refund status command
program
  .command("refund-status")
  .description("Check the status of a refund request")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { publicClient, networkId } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);
    const networkConfig = getNetworkConfig(networkId)!;

    const status = await getRefundStatus({
      paymentInfo,
      nonce: BigInt(options.nonce),
      operatorAddress: options.operatorAddress as `0x${string}`,
      refundRequestAddress: networkConfig.refundRequest,
      publicClient,
    });

    if (status === null) {
      console.log("\nNo refund request found for this payment");
    } else {
      const statusNames = ["Pending", "Approved", "Denied", "Cancelled"];
      console.log(`\nRefund status: ${statusNames[status] || status}`);
    }
  });

// Submit evidence command
program
  .command("submit-evidence")
  .description("Submit evidence for a dispute")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-c, --cid <cid>", "IPFS CID of the evidence")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { publicClient, walletClient, networkId } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);
    const networkConfig = getNetworkConfig(networkId)!;

    const result = await submitEvidence({
      paymentInfo,
      nonce: BigInt(options.nonce),
      cid: options.cid,
      operatorAddress: options.operatorAddress as `0x${string}`,
      refundRequestEvidenceAddress: networkConfig.refundRequestEvidence as `0x${string}`,
      publicClient,
      walletClient,
    });

    if (result.success) {
      if (result.txHash) {
        console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
      }
    } else {
      console.error("\nSubmit evidence failed:", result.error);
      process.exit(1);
    }
  });

// Show evidence command (renamed from list-evidence for consistency with merchant/arbiter CLIs)
program
  .command("show-evidence")
  .description("Show all evidence for a payment dispute")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { publicClient, networkId } = initCli();
    const paymentInfo = getPaymentInfoFromState(options);
    const networkConfig = getNetworkConfig(networkId)!;

    try {
      await listEvidence({
        paymentInfo,
        nonce: BigInt(options.nonce),
        operatorAddress: options.operatorAddress as `0x${string}`,
        refundRequestEvidenceAddress: networkConfig.refundRequestEvidence as `0x${string}`,
        publicClient,
      });
    } catch (error) {
      console.error("\nFailed to list evidence:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Info command
program
  .command("info")
  .description("Show configuration info")
  .action(() => {
    const { account, networkId, networkConfig } = initCli();

    console.log("\n=== Client Info ===");
    console.log("  Address:", account.address);
    console.log("  Network:", networkId);
    console.log("  RPC:", process.env.RPC_URL || "https://sepolia.base.org");

    console.log("\n=== Protocol Addresses ===");
    console.log("  Escrow:", networkConfig.authCaptureEscrow);
    console.log("  RefundRequest:", networkConfig.refundRequest);
    console.log("  TokenCollector:", networkConfig.tokenCollector);
    console.log("  USDC:", networkConfig.usdc);
  });

// Preview fee command
program
  .command("preview-fee")
  .description("Preview fees for a payment before authorizing")
  .requiredOption("-o, --operator-address <address>", "Operator address")
  .requiredOption("-a, --amount <amount>", "Amount to calculate fees for (in token units)")
  .option("-p, --payment-json <json>", "Payment info JSON (optional, for bounds validation)")
  .action(async options => {
    const { publicClient, account, networkId } = initCli();
    const operatorAddress = options.operatorAddress as `0x${string}`;
    const amount = BigInt(options.amount);
    const networkConfig = getNetworkConfig(networkId)!;

    // Create a minimal payment info for fee calculation if not provided
    const paymentInfo: PaymentInfo = options.paymentJson
      ? parsePaymentInfo(options.paymentJson)
      : {
          operator: operatorAddress,
          payer: account.address,
          receiver: "0x0000000000000000000000000000000000000001",
          token: networkConfig.usdc,
          maxAmount: amount,
          preApprovalExpiry: 0n,
          authorizationExpiry: 0n,
          refundExpiry: 0n,
          minFeeBps: 0,
          maxFeeBps: 10000, // 100%
          feeReceiver: "0x0000000000000000000000000000000000000001",
          salt: 0n,
        };

    console.log("\nPreviewing fees...");
    console.log("  Amount:", amount.toString());
    console.log("  Operator:", operatorAddress);
    console.log("  Payer:", account.address);

    try {
      const fees = await calculateTotalFees(
        publicClient,
        operatorAddress,
        paymentInfo,
        amount,
        account.address,
      );

      console.log("\n" + formatFeeBreakdown(fees));

      // Validate bounds if payment info was provided
      if (options.paymentJson) {
        const isValid = validateFeeBounds(fees, paymentInfo);
        console.log(
          `\nFee Bounds: ${isValid ? "VALID" : "INVALID"} (min: ${paymentInfo.minFeeBps} bps, max: ${paymentInfo.maxFeeBps} bps)`,
        );
        if (!isValid) {
          console.log("WARNING: Fees are outside the acceptable bounds for this payment!");
        }
      }
    } catch (error) {
      console.error("\nFailed to preview fees:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
