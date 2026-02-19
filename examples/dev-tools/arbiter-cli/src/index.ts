#!/usr/bin/env node

/**
 * x402r Arbiter CLI
 *
 * A command-line tool for arbiter operations: reviewing and deciding refund requests.
 *
 * Usage:
 *   pnpm start list                              # List pending refund requests
 *   pnpm start show <key>                        # Show request details
 *   pnpm start approve <key>                     # Approve a refund request
 *   pnpm start deny <key>                        # Deny a refund request
 *   pnpm start execute --payment-json '...'      # Execute approved refund (or use saved state)
 *   pnpm start watch                             # Watch for new refund requests
 *   pnpm start info                              # Show arbiter wallet info
 */

import { Command } from "commander";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { X402rArbiter } from "@x402r/arbiter";
import { RequestStatus, distributeFees } from "@x402r/core";
import { initCli } from "../../shared/cli-setup.js";
import { getPaymentInfoFromState } from "../../shared/state.js";
import { shortAddress, formatUSDC, formatEvidenceList } from "../../shared/utils.js";
import { showEvidence, submitArbiterEvidence } from "./commands/evidence.js";

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

// Status name mapping
const STATUS_NAMES = ["Pending", "Approved", "Denied", "Cancelled"] as const;

// Create arbiter SDK from shared setup
function createArbiter() {
  const { account, publicClient, walletClient, networkId, networkConfig, operatorAddress } =
    initCli({ requireOperator: true });

  const arbiterRegistryAddress = process.env.ARBITER_REGISTRY_ADDRESS as `0x${string}` | undefined;

  const arbiter = new X402rArbiter({
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    escrowAddress: networkConfig.authCaptureEscrow,
    refundRequestAddress: networkConfig.refundRequest,
    refundRequestEvidenceAddress: networkConfig.refundRequestEvidence,
    arbiterRegistryAddress,
  });

  const receiverAddress = (process.env.RECEIVER_ADDRESS as `0x${string}`) || account.address;
  const freezeAddress = process.env.FREEZE_ADDRESS as `0x${string}` | undefined;

  return {
    arbiter,
    account,
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    networkId,
    networkConfig,
    receiverAddress,
    freezeAddress,
  };
}

// Create CLI
const program = new Command();

program.name("x402r-arbiter").description("CLI tool for x402r arbiter operations").version("0.0.1");

// Info command
program
  .command("info")
  .description("Show arbiter configuration info")
  .action(() => {
    const { account, operatorAddress, networkId, networkConfig, receiverAddress, freezeAddress } =
      createArbiter();

    console.log("\n=== Arbiter Info ===");
    console.log("  Address:", account.address);
    console.log("  Network:", networkId);
    console.log("  RPC:", process.env.RPC_URL || "https://sepolia.base.org");

    console.log("\n=== Operator ===");
    console.log("  Operator:", operatorAddress);
    console.log("  Receiver:", receiverAddress);
    if (freezeAddress) {
      console.log("  Freeze:", freezeAddress);
    }

    console.log("\n=== Protocol Addresses ===");
    console.log("  Escrow:", networkConfig.authCaptureEscrow);
    console.log("  RefundRequest:", networkConfig.refundRequest);
    console.log("  USDC:", networkConfig.usdc);
  });

// List pending refund requests
program
  .command("list")
  .description("List pending refund requests")
  .option("-o, --offset <offset>", "Starting offset", "0")
  .option("-c, --count <count>", "Number of requests to fetch", "10")
  .action(async options => {
    const { arbiter, receiverAddress } = createArbiter();
    const offset = BigInt(options.offset);
    const count = BigInt(options.count);

    console.log("\nFetching refund requests...");
    console.log("  Receiver:", receiverAddress);

    try {
      const { keys, total } = await arbiter.getReceiverRefundRequests(
        offset,
        count,
        receiverAddress,
      );
      console.log(`\nFound ${total} total refund requests`);

      if (keys.length === 0) {
        console.log("No refund requests found");
        return;
      }

      console.log(`\nShowing ${keys.length} requests (offset: ${offset}):\n`);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        try {
          const request = await arbiter.getRefundRequestByKey(key);
          const statusName = STATUS_NAMES[request.status] || String(request.status);
          const isPending = request.status === RequestStatus.Pending;

          console.log(`${Number(offset) + i + 1}. ${key}`);
          console.log(`   Amount: ${formatUSDC(request.amount)}`);
          console.log(`   Status: ${statusName}${isPending ? " ⏳" : ""}`);
          console.log("");
        } catch {
          console.log(`${Number(offset) + i + 1}. ${key}`);
          console.log("   Error: Could not fetch request details");
          console.log("");
        }
      }
    } catch (error) {
      console.error("\nFailed to fetch requests:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Show request details
program
  .command("show <key>")
  .description("Show details of a specific refund request")
  .action(async (key: string) => {
    const { arbiter } = createArbiter();

    console.log("\nFetching refund request...");
    console.log("  Key:", key);

    try {
      const request = await arbiter.getRefundRequestByKey(key as `0x${string}`);
      const statusName = STATUS_NAMES[request.status] || String(request.status);

      console.log("\n=== Refund Request Details ===");
      console.log("  Key:", key);
      console.log("  Amount:", formatUSDC(request.amount));
      console.log("  Status:", statusName);
      console.log("  Payment Hash:", request.paymentInfoHash);
      console.log("  Nonce:", request.nonce.toString());

      // Show evidence count if evidence contract is configured
      try {
        // We need paymentInfo to query evidence — this is a limitation
        // when only the key is provided. Show a hint instead.
        console.log("\n  Use 'show-evidence' with --payment-json to view dispute evidence");
      } catch {
        // Ignore
      }

      if (request.status === RequestStatus.Pending) {
        console.log("\nThis request is pending. You can approve or deny it:");
        console.log(`   pnpm start approve ${key}`);
        console.log(`   pnpm start deny ${key}`);
      } else if (request.status === RequestStatus.Approved) {
        console.log("\nThis request is approved. It can be executed by the payer.");
      }
    } catch (error) {
      console.error("\nFailed to fetch request:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Approve a refund request by key
program
  .command("approve <key>")
  .description("Approve a refund request (requires payment JSON)")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async (key: string, options) => {
    const { arbiter } = createArbiter();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    // The key parameter is for display/audit trail only.
    // The actual on-chain operation uses paymentInfo + nonce to identify the request.
    console.log("\nApproving refund request...");
    console.log("  Key:", key);
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Nonce:", nonce.toString());

    // Show evidence summary before decision
    try {
      const evidenceCount = await arbiter.getEvidenceCount(paymentInfo, nonce);
      if (evidenceCount > 0n) {
        const entries = await arbiter.getAllEvidence(paymentInfo, nonce);
        console.log(`\n=== Evidence (${evidenceCount} entries) ===`);
        console.log(formatEvidenceList(entries));
      } else {
        console.log("\n  No evidence submitted");
      }
    } catch {
      // Evidence contract may not be configured — proceed without
    }

    try {
      const result = await arbiter.approveRefundRequest(paymentInfo, nonce);
      console.log("\nRefund request approved!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nApproval failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Deny a refund request by key
program
  .command("deny <key>")
  .description("Deny a refund request (requires payment JSON)")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async (key: string, options) => {
    const { arbiter } = createArbiter();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    // The key parameter is for display/audit trail only.
    // The actual on-chain operation uses paymentInfo + nonce to identify the request.
    console.log("\nDenying refund request...");
    console.log("  Key:", key);
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Nonce:", nonce.toString());

    // Show evidence summary before decision
    try {
      const evidenceCount = await arbiter.getEvidenceCount(paymentInfo, nonce);
      if (evidenceCount > 0n) {
        const entries = await arbiter.getAllEvidence(paymentInfo, nonce);
        console.log(`\n=== Evidence (${evidenceCount} entries) ===`);
        console.log(formatEvidenceList(entries));
      } else {
        console.log("\n  No evidence submitted");
      }
    } catch {
      // Evidence contract may not be configured — proceed without
    }

    try {
      const result = await arbiter.denyRefundRequest(paymentInfo, nonce);
      console.log("\nRefund request denied!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nDenial failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Execute a refund (after approval)
program
  .command("execute")
  .description("Execute a refund for an approved request")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-a, --amount <amount>", "Amount to refund (defaults to maxAmount)")
  .action(async options => {
    const { arbiter } = createArbiter();
    const paymentInfo = getPaymentInfoFromState(options);
    const amount = options.amount ? BigInt(options.amount) : undefined;

    console.log("\nExecuting refund...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Amount:", amount ? formatUSDC(amount) : "maxAmount");

    try {
      const result = await arbiter.executeRefundInEscrow(paymentInfo, amount);
      console.log("\nRefund executed!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nExecution failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Check refund status
program
  .command("status")
  .description("Check the status of a refund request")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { arbiter } = createArbiter();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    try {
      const hasRequest = await arbiter.hasRefundRequest(paymentInfo, nonce);
      if (!hasRequest) {
        console.log("\nNo refund request found for this payment");
        return;
      }

      const status = await arbiter.getRefundStatus(paymentInfo, nonce);
      const statusName = STATUS_NAMES[status] || String(status);
      console.log(`\nRefund status: ${statusName}`);

      const request = await arbiter.getRefundRequest(paymentInfo, nonce);
      console.log("  Amount requested:", formatUSDC(request.amount));
    } catch (error) {
      console.error("\nFailed to get status:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Check if payment is frozen
program
  .command("is-frozen")
  .description("Check if a payment is frozen")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option(
    "-f, --freeze-address <address>",
    "Freeze contract address (uses FREEZE_ADDRESS env if not provided)",
  )
  .action(async options => {
    const { arbiter, freezeAddress: envFreezeAddress } = createArbiter();
    const paymentInfo = getPaymentInfoFromState(options);
    const freezeAddress = (options.freezeAddress as `0x${string}`) || envFreezeAddress;

    if (!freezeAddress) {
      console.error("Error: Freeze address required (--freeze-address or FREEZE_ADDRESS env)");
      process.exit(1);
    }

    try {
      const isFrozen = await arbiter.isFrozen(paymentInfo, freezeAddress);
      console.log(`\nPayment is ${isFrozen ? "FROZEN" : "NOT FROZEN"}`);
    } catch (error) {
      console.error(
        "\nFailed to check freeze status:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Watch for new refund requests
program
  .command("watch")
  .description("Watch for new refund requests (Ctrl+C to stop)")
  .action(() => {
    const { arbiter, receiverAddress } = createArbiter();

    console.log("\nWatching for new refund requests...");
    console.log("  Receiver:", receiverAddress);
    console.log("  Press Ctrl+C to stop\n");

    const { unsubscribe: unsubscribeCases } = arbiter.watchNewCases(event => {
      const log = event as {
        args?: { payer?: string; receiver?: string; amount?: bigint };
      };
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] New refund request`);
      if (log.args) {
        if (log.args.payer) console.log(`    Payer: ${shortAddress(log.args.payer)}`);
        if (log.args.receiver) console.log(`    Receiver: ${shortAddress(log.args.receiver)}`);
        if (log.args.amount) console.log(`    Amount: ${formatUSDC(log.args.amount)}`);
      }
      console.log("");
    });

    const { unsubscribe: unsubscribeDecisions } = arbiter.watchDecisions(event => {
      const log = event as { args?: { status?: number } };
      const timestamp = new Date().toLocaleTimeString();
      const status = log.args?.status;
      const statusName = status !== undefined ? STATUS_NAMES[status] || String(status) : "Unknown";
      console.log(`[${timestamp}] Status updated: ${statusName}`);
      console.log("");
    });

    // Handle graceful shutdown
    const cleanup = () => {
      console.log("\n\nStopping watch...");
      unsubscribeCases();
      unsubscribeDecisions();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  });

// Get request count
program
  .command("count")
  .description("Get total number of refund requests")
  .action(async () => {
    const { arbiter, receiverAddress } = createArbiter();

    try {
      const count = await arbiter.getRefundRequestCount(receiverAddress);
      console.log(`\nTotal refund requests: ${count}`);
    } catch (error) {
      console.error("\nFailed to get count:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============ Evidence Commands ============

// Show evidence command
program
  .command("show-evidence")
  .description("Show all evidence for a dispute case")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { arbiter } = createArbiter();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    try {
      await showEvidence(arbiter, paymentInfo, nonce);
    } catch (error) {
      console.error("\nFailed to show evidence:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Submit evidence command
program
  .command("submit-evidence")
  .description("Submit evidence as arbiter")
  .option("-p, --payment-json <json>", "Payment info JSON (reads from saved state if omitted)")
  .requiredOption("-c, --cid <cid>", "IPFS CID of the evidence")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { arbiter } = createArbiter();
    const paymentInfo = getPaymentInfoFromState(options);
    const nonce = BigInt(options.nonce);

    try {
      const result = await submitArbiterEvidence(arbiter, paymentInfo, nonce, options.cid);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nSubmit evidence failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============ Registry Commands ============

// Register as arbiter
program
  .command("register")
  .description("Register as an arbiter in the ArbiterRegistry")
  .requiredOption("-u, --uri <uri>", "URI for arbiter metadata/API endpoint")
  .action(async options => {
    const { arbiter } = createArbiter();

    console.log("\nRegistering as arbiter...");
    console.log("  URI:", options.uri);

    try {
      const result = await arbiter.registerArbiter(options.uri);
      console.log("\nRegistered!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nRegistration failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Update arbiter URI
program
  .command("update-uri")
  .description("Update your arbiter URI")
  .requiredOption("-u, --uri <uri>", "New URI")
  .action(async options => {
    const { arbiter } = createArbiter();

    console.log("\nUpdating arbiter URI...");
    console.log("  New URI:", options.uri);

    try {
      const result = await arbiter.updateArbiterUri(options.uri);
      console.log("\nURI updated!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nUpdate failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Deregister
program
  .command("deregister")
  .description("Deregister from the ArbiterRegistry")
  .action(async () => {
    const { arbiter } = createArbiter();

    console.log("\nDeregistering...");

    try {
      const result = await arbiter.deregisterArbiter();
      console.log("\nDeregistered!");
      console.log("  Transaction:", result.txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${result.txHash}`);
    } catch (error) {
      console.error("\nDeregistration failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List registered arbiters
program
  .command("registry-list")
  .description("List registered arbiters")
  .option("-o, --offset <offset>", "Starting offset", "0")
  .option("-c, --count <count>", "Number of arbiters to fetch", "10")
  .action(async options => {
    const { arbiter } = createArbiter();
    const offset = BigInt(options.offset);
    const count = BigInt(options.count);

    try {
      const { arbiters, uris, total } = await arbiter.listArbiters(offset, count);
      console.log(`\nFound ${total} registered arbiters`);

      if (arbiters.length === 0) {
        console.log("No arbiters found");
        return;
      }

      console.log(`\nShowing ${arbiters.length} (offset: ${offset}):\n`);
      for (let i = 0; i < arbiters.length; i++) {
        console.log(`${Number(offset) + i + 1}. ${arbiters[i]}`);
        console.log(`   URI: ${uris[i]}`);
        console.log("");
      }
    } catch (error) {
      console.error("\nFailed to list arbiters:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Check if address is registered
program
  .command("registry-check")
  .description("Check if an address is a registered arbiter")
  .requiredOption("-a, --address <address>", "Address to check")
  .action(async options => {
    const { arbiter } = createArbiter();
    const address = options.address as `0x${string}`;

    try {
      const isRegistered = await arbiter.isArbiterRegistered(address);
      if (isRegistered) {
        const uri = await arbiter.getArbiterUri(address);
        console.log(`\n${address} is a registered arbiter`);
        console.log(`   URI: ${uri}`);
      } else {
        console.log(`\n${address} is NOT a registered arbiter`);
      }
    } catch (error) {
      console.error("\nFailed to check:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Distribute fees command
program
  .command("distribute-fees")
  .description("Distribute accumulated protocol and operator fees")
  .option("-t, --token <address>", "Token address (defaults to USDC)")
  .action(async options => {
    const { walletClient, operatorAddress, networkConfig } = createArbiter();
    const token = (options.token as `0x${string}`) || (networkConfig.usdc as `0x${string}`);

    console.log("\nDistributing fees...");
    console.log("  Operator:", operatorAddress);
    console.log("  Token:", token);

    try {
      const txHash = await distributeFees(walletClient, operatorAddress, token);
      console.log("\nFees distributed!");
      console.log("  Transaction:", txHash);
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`);
    } catch (error) {
      console.error("\nFee distribution failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
