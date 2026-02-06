/**
 * x402r Facilitator Service
 *
 * Implements x402's facilitator protocol (GET /supported, POST /verify, POST /settle)
 * for escrow-based payments. Holds the wallet key and calls authorize() on-chain.
 *
 * Usage:
 *   1. Deploy an operator: PRIVATE_KEY=0x... pnpm example:deploy-operator
 *   2. Copy OPERATOR_ADDRESS to .env
 *   3. Run: pnpm dev
 *   4. Test: curl http://localhost:4022/supported
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getNetworkConfig } from "@x402r/core";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { EscrowFacilitatorScheme } from "@x402r/evm/escrow/facilitator";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { loadConfig, createClients } from "./config.js";

// Load environment from the app directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

// Initialize configuration
const config = loadConfig();
const { publicClient, walletClient, account } = createClients(config);

// Create facilitator signer using x402's toFacilitatorEvmSigner
const facilitatorSigner = toFacilitatorEvmSigner({
  address: account.address,
  readContract: (args) =>
    publicClient.readContract({ ...args, args: args.args || [] }),
  verifyTypedData: (args) => publicClient.verifyTypedData(args as never),
  writeContract: (args) =>
    walletClient.writeContract({
      ...args,
      account,
      chain: walletClient.chain,
      args: args.args || [],
    }),
  sendTransaction: (args) =>
    walletClient.sendTransaction({
      ...args,
      account,
      chain: walletClient.chain,
    }),
  waitForTransactionReceipt: (args) =>
    publicClient.waitForTransactionReceipt(args),
  getCode: (args) => publicClient.getCode(args),
});
const escrowScheme = new EscrowFacilitatorScheme(facilitatorSigner);

// Get network config for contract addresses
const networkConfig = getNetworkConfig(config.network);
if (!networkConfig) {
  console.error(
    `Error: Network ${config.network} is not configured in @x402r/core`,
  );
  process.exit(1);
}

console.log("x402r Facilitator Configuration:");
console.log("  Address:", account.address);
console.log("  Operator:", config.operatorAddress);
console.log("  Network:", config.network);
console.log("  Escrow:", networkConfig.authCaptureEscrow);
console.log("  TokenCollector:", networkConfig.tokenCollector);

const app = new Hono();
app.use("*", cors());

/**
 * GET /supported — Returns supported schemes/networks
 *
 * x402's HTTPFacilitatorClient calls this to discover what the facilitator supports.
 * The `extra` field flows through to merchant payment requirements via
 * EscrowServerScheme.enhancePaymentRequirements().
 */
app.get("/supported", (c) => {
  return c.json({
    kinds: [
      {
        x402Version: 2,
        scheme: "escrow",
        network: config.network,
        extra: {
          escrowAddress: networkConfig.authCaptureEscrow,
          operatorAddress: config.operatorAddress,
          tokenCollector: networkConfig.tokenCollector,
          minFeeBps: 0,
          maxFeeBps: 1000,
          name: "USDC",
          version: "2",
        },
      },
    ],
    extensions: [],
    signers: {
      eip155: escrowScheme.getSigners(config.network),
    },
  });
});

/**
 * POST /verify — Verify escrow payment signature
 *
 * Body: { x402Version, paymentPayload, paymentRequirements }
 */
app.post("/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { paymentPayload, paymentRequirements } = body;

    if (!paymentPayload || !paymentRequirements) {
      return c.json(
        {
          isValid: false,
          invalidReason: "Missing paymentPayload or paymentRequirements",
        },
        400,
      );
    }

    const escrowPayload: PaymentPayload = {
      x402Version: paymentPayload.x402Version ?? 2,
      scheme:
        paymentPayload.accepted?.scheme ?? paymentPayload.scheme ?? "escrow",
      ...paymentPayload,
    };

    const result = await escrowScheme.verify(
      escrowPayload,
      paymentRequirements as PaymentRequirements,
    );

    return c.json(result);
  } catch (error) {
    console.error("[verify] Error:", error);
    return c.json(
      {
        isValid: false,
        invalidReason:
          error instanceof Error ? error.message : "Verification failed",
      },
      500,
    );
  }
});

/**
 * POST /settle — Settle payment on-chain (calls authorize())
 *
 * Body: { x402Version, paymentPayload, paymentRequirements }
 */
app.post("/settle", async (c) => {
  try {
    const body = await c.req.json();
    const { paymentPayload, paymentRequirements } = body;

    if (!paymentPayload || !paymentRequirements) {
      return c.json(
        {
          success: false,
          errorReason: "Missing paymentPayload or paymentRequirements",
          transaction: "",
          network: config.network,
        },
        400,
      );
    }

    const escrowPayload: PaymentPayload = {
      x402Version: paymentPayload.x402Version ?? 2,
      scheme:
        paymentPayload.accepted?.scheme ?? paymentPayload.scheme ?? "escrow",
      ...paymentPayload,
    };

    const result = await escrowScheme.settle(
      escrowPayload,
      paymentRequirements as PaymentRequirements,
    );

    return c.json(result);
  } catch (error) {
    console.error("[settle] Error:", error);
    return c.json(
      {
        success: false,
        errorReason:
          error instanceof Error ? error.message : "Settlement failed",
        transaction: "",
        network: config.network,
      },
      500,
    );
  }
});

// Health check
app.get("/", (c) => {
  return c.json({
    name: "x402r Facilitator",
    version: "0.0.1",
    network: config.network,
    operator: config.operatorAddress,
    facilitator: account.address,
    endpoints: {
      "/": "Health check",
      "/supported": "GET - Supported schemes and networks",
      "/verify": "POST - Verify escrow payment",
      "/settle": "POST - Settle payment on-chain",
    },
  });
});

// Start server
const port = config.port;
console.log(`\nStarting facilitator on port ${port}...`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`Facilitator running at http://localhost:${port}`);
    console.log("\nEndpoints:");
    console.log(
      `  GET  http://localhost:${port}/supported  - Supported schemes`,
    );
    console.log(`  POST http://localhost:${port}/verify     - Verify payment`);
    console.log(`  POST http://localhost:${port}/settle     - Settle payment`);
  },
);
