#!/usr/bin/env node

/**
 * x402r Merchant CLI
 *
 * A command-line tool for merchant operations: releasing funds, managing refunds, etc.
 *
 * Usage:
 *   pnpm start release --payment-json '{"operator":...}' --amount 10000
 *   pnpm start approve-refund --payment-json '{"operator":...}'
 *   pnpm start payment-amounts --payment-json '{"operator":...}'
 */

import { Command } from "commander";
import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { X402rMerchant } from "@x402r/merchant";
import {
  getNetworkConfig,
  calculateTotalFees,
  formatFeeBreakdown,
  validateFeeBounds,
  type PaymentInfo,
} from "@x402r/core";
import { parsePaymentInfo } from "../../shared/utils.js";

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

const NETWORK_ID = process.env.NETWORK_ID || "eip155:84532";
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";

// Create viem clients and merchant SDK
function createMerchant() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  const operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;
  if (!operatorAddress) {
    console.error("Error: OPERATOR_ADDRESS environment variable is required");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  const networkConfig = getNetworkConfig(NETWORK_ID)!;

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const merchant = new X402rMerchant({
    publicClient,
    walletClient,
    operatorAddress,
    escrowAddress: networkConfig.authCaptureEscrow,
    refundRequestAddress: networkConfig.refundRequest,
    chainId: 84532,
  });

  return {
    merchant,
    account,
    publicClient,
    walletClient,
    operatorAddress,
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
    const { account, operatorAddress, networkConfig } = createMerchant();

    console.log("\n=== Merchant Info ===");
    console.log("  Address:", account.address);
    console.log("  Network:", NETWORK_ID);
    console.log("  RPC:", RPC_URL);

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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .option("-a, --amount <amount>", "Amount to release (defaults to maxAmount)")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);

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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .requiredOption("-a, --amount <amount>", "Amount to refund")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
    const nonce = BigInt(options.nonce);

    console.log("\nApproving refund request...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Nonce:", nonce.toString());

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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
    const nonce = BigInt(options.nonce);

    console.log("\nDenying refund request...");
    console.log("  Payer:", paymentInfo.payer);
    console.log("  Nonce:", nonce.toString());

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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .option("-n, --nonce <nonce>", "Nonce (record index)", "0")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .requiredOption("-f, --freeze-address <address>", "Freeze contract address")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
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
  .requiredOption("-p, --payment-json <json>", "Payment info JSON")
  .requiredOption("-f, --freeze-address <address>", "Freeze contract address")
  .action(async options => {
    const { merchant } = createMerchant();
    const paymentInfo = parsePaymentInfo(options.paymentJson);
    const freezeAddress = options.freezeAddress as `0x${string}`;

    try {
      const isFrozen = await merchant.isFrozen(paymentInfo, freezeAddress);
      console.log(`\nPayment is ${isFrozen ? "FROZEN" : "NOT FROZEN"}`);
    } catch (error) {
      console.error("\nFailed to check status:", error instanceof Error ? error.message : error);
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
    const { publicClient, account, operatorAddress } = createMerchant();
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
