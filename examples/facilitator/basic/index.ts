/**
 * x402r Facilitator — Basic Example
 *
 * Forked from x402/examples/typescript/facilitator/basic/index.ts
 * with the following x402 → x402r changes:
 *   - registerExactEvmScheme → registerEscrowScheme
 *   - EVM_PRIVATE_KEY → PRIVATE_KEY + OPERATOR_ADDRESS env vars
 *   - SVM support removed (EVM-only)
 *   - Escrow config (operatorAddress, escrowAddress, tokenCollector) passed to scheme
 *
 * Usage:
 *   1. Deploy an operator: PRIVATE_KEY=0x... pnpm example:deploy-operator
 *   2. Copy .env-local to .env and fill in your values
 *   3. Run: pnpm example:facilitator
 *   4. Test: curl http://localhost:4022/supported
 */

import { x402Facilitator } from "@x402/core/facilitator";
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "@x402/core/types";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { registerEscrowScheme } from "@x402r/evm/escrow/facilitator";
import { getNetworkConfig } from "@x402r/core";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";

// Load .env from this example's directory (works when run from repo root via tsx)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

// Configuration
const PORT = process.env.PORT || "4022";
const NETWORK = process.env.NETWORK || "eip155:84532";

// Validate required environment variables
if (!process.env.PRIVATE_KEY) {
  console.error("PRIVATE_KEY environment variable is required");
  process.exit(1);
}

if (!process.env.OPERATOR_ADDRESS) {
  console.error("OPERATOR_ADDRESS environment variable is required");
  process.exit(1);
}

const operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;

// Look up escrow contract addresses from network config
const networkConfig = getNetworkConfig(NETWORK);
if (!networkConfig) {
  console.error(`Network ${NETWORK} is not configured in @x402r/core`);
  process.exit(1);
}

// Initialize the EVM account from private key
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
console.info(`Facilitator account: ${account.address}`);
console.info(`Operator: ${operatorAddress}`);
console.info(`Network: ${NETWORK}`);

// Create a Viem client with both wallet and public capabilities
const chain = NETWORK === "eip155:8453" ? base : baseSepolia;
const viemClient = createWalletClient({
  account,
  chain,
  transport: http(),
}).extend(publicActions);

// Create facilitator signer using x402's toFacilitatorEvmSigner
const evmSigner = toFacilitatorEvmSigner({
  getCode: (args: { address: `0x${string}` }) => viemClient.getCode(args),
  address: account.address,
  readContract: (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) =>
    viemClient.readContract({
      ...args,
      args: args.args || [],
    }),
  verifyTypedData: (args: {
    address: `0x${string}`;
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
    signature: `0x${string}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) => viemClient.verifyTypedData(args as any),
  writeContract: (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) =>
    viemClient.writeContract({
      ...args,
      args: args.args || [],
    }),
  sendTransaction: (args: { to: `0x${string}`; data: `0x${string}` }) =>
    viemClient.sendTransaction(args),
  waitForTransactionReceipt: (args: { hash: `0x${string}` }) =>
    viemClient.waitForTransactionReceipt(args),
});

// Initialize the x402 Facilitator with escrow scheme
const facilitator = new x402Facilitator();

// Register escrow scheme — this is the key x402 → x402r change.
// x402 uses: registerExactEvmScheme(facilitator, { signer, networks })
// x402r adds: operatorAddress, escrowAddress, tokenCollector for getExtra() metadata
registerEscrowScheme(facilitator, {
  signer: evmSigner,
  networks: NETWORK,
  operatorAddress,
  escrowAddress: networkConfig.authCaptureEscrow,
  tokenCollector: networkConfig.tokenCollector,
});

// Initialize Express app
const app = express();
app.use(express.json());

/**
 * POST /verify
 * Verify a payment against requirements
 */
app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        error: "Missing paymentPayload or paymentRequirements",
      });
    }

    const response: VerifyResponse = await facilitator.verify(paymentPayload, paymentRequirements);

    res.json(response);
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /settle
 * Settle a payment on-chain
 */
app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        error: "Missing paymentPayload or paymentRequirements",
      });
    }

    const response: SettleResponse = await facilitator.settle(
      paymentPayload as PaymentPayload,
      paymentRequirements as PaymentRequirements,
    );

    res.json(response);
  } catch (error) {
    console.error("Settle error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /supported
 * Get supported payment kinds and extensions
 *
 * With the getExtra() fix, this now returns escrow metadata
 * (operatorAddress, escrowAddress, tokenCollector) automatically.
 */
app.get("/supported", async (_req, res) => {
  try {
    const response = facilitator.getSupported();
    res.json(response);
  } catch (error) {
    console.error("Supported error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Health check
app.get("/", (_req, res) => {
  res.json({
    name: "x402r Facilitator",
    network: NETWORK,
    operator: operatorAddress,
    facilitator: account.address,
  });
});

// Start the server
app.listen(parseInt(PORT), () => {
  console.log(`Facilitator listening on http://localhost:${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/supported`);
  console.log(`  POST http://localhost:${PORT}/verify`);
  console.log(`  POST http://localhost:${PORT}/settle`);
});
