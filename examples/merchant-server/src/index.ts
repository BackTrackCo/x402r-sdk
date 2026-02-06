/**
 * Merchant Server Example
 *
 * A simple weather API that requires x402r escrow payments.
 * Uses x402's standard paymentMiddleware + HTTPFacilitatorClient to delegate
 * verify/settle to an x402r facilitator service.
 *
 * Usage:
 *   1. Deploy an operator: PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts
 *   2. Copy addresses to .env
 *   3. Start facilitator: cd examples/facilitator && pnpm dev
 *   4. Start merchant: cd examples/merchant-server && pnpm dev
 *   5. Test: curl http://localhost:3000/weather
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { EscrowServerScheme } from "@x402r/evm/escrow/server";
import { refundable } from "@x402r/helpers";
import { X402rMerchant } from "@x402r/merchant";
import { type PaymentInfo, getNetworkConfig } from "@x402r/core";
import { loadConfig, createClients, NETWORK_ID } from "./config.js";

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

// Initialize configuration
const config = loadConfig();
const { publicClient, walletClient, account } = createClients(config);

console.log("Merchant Server Configuration:");
console.log("  Address:", account.address);
console.log("  Operator:", config.operatorAddress);
console.log("  Facilitator:", config.facilitatorUrl);
console.log("  Network:", NETWORK_ID);

// Create facilitator client pointing to x402r facilitator service
const facilitator = new HTTPFacilitatorClient({
  url: config.facilitatorUrl,
});

// Create Hono app
const app = new Hono();
app.use("*", cors());

// x402 payment middleware — delegates verify/settle to the facilitator
app.use(
  paymentMiddlewareFromConfig(
    {
      "GET /weather": {
        accepts: [
          refundable(
            {
              scheme: "escrow",
              price: "$0.01",
              network: NETWORK_ID,
              payTo: account.address,
            },
            config.operatorAddress,
          ),
        ],
      },
    },
    facilitator,
    [{ network: NETWORK_ID, server: new EscrowServerScheme() }],
  ),
);

// Merchant SDK for release/refund operations
const networkConfig = getNetworkConfig(NETWORK_ID)!;
const merchant = new X402rMerchant({
  publicClient,
  walletClient,
  operatorAddress: config.operatorAddress,
  escrowAddress: networkConfig.authCaptureEscrow,
  refundRequestAddress: networkConfig.refundRequest,
  chainId: 84532,
});

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    name: "x402r Weather API",
    version: "1.0.0",
    endpoints: {
      "/": "This endpoint (health check)",
      "/weather": "Get weather data (requires payment)",
      "/info": "Get payment info (no payment required)",
      "/release": "POST - Release funds from escrow",
      "/payment-amounts": "POST - Get capturable/refundable amounts",
    },
  });
});

// Payment info endpoint (no payment required)
app.get("/info", (c) => {
  return c.json({
    network: NETWORK_ID,
    operator: config.operatorAddress,
    merchant: account.address,
    facilitator: config.facilitatorUrl,
  });
});

// Protected weather endpoint
app.get("/weather", (c) => {
  const weather = {
    location: "San Francisco, CA",
    temperature: { value: 68, unit: "F" },
    conditions: "Partly Cloudy",
    humidity: 65,
    wind: { speed: 12, direction: "NW", unit: "mph" },
    forecast: [
      { day: "Today", high: 72, low: 58, conditions: "Partly Cloudy" },
      { day: "Tomorrow", high: 75, low: 60, conditions: "Sunny" },
      { day: "Wednesday", high: 70, low: 55, conditions: "Cloudy" },
    ],
  };

  return c.json(weather);
});

// Release endpoint - merchant releases funds from escrow
app.post("/release", async (c) => {
  try {
    const body = await c.req.json();
    const { paymentInfo, amount } = body as {
      paymentInfo: PaymentInfo;
      amount: string;
    };

    if (!paymentInfo) {
      return c.json({ error: "paymentInfo is required" }, 400);
    }

    const parsedPaymentInfo: PaymentInfo = {
      ...paymentInfo,
      maxAmount: BigInt(paymentInfo.maxAmount),
      salt: BigInt(paymentInfo.salt),
    };

    const releaseAmount = amount ? BigInt(amount) : parsedPaymentInfo.maxAmount;

    console.log("[release] Releasing funds...");
    console.log("  Payer:", parsedPaymentInfo.payer);
    console.log("  Amount:", releaseAmount.toString());

    const result = await merchant.release(parsedPaymentInfo, releaseAmount);

    console.log("[release] Success! TX:", result.txHash);

    return c.json({
      success: true,
      txHash: result.txHash,
      explorerUrl: `https://sepolia.basescan.org/tx/${result.txHash}`,
    });
  } catch (error) {
    console.error("[release] Error:", error);
    return c.json(
      {
        error: "Release failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Get payment amounts endpoint
app.post("/payment-amounts", async (c) => {
  try {
    const body = await c.req.json();
    const { paymentInfo } = body as { paymentInfo: PaymentInfo };

    if (!paymentInfo) {
      return c.json({ error: "paymentInfo is required" }, 400);
    }

    const parsedPaymentInfo: PaymentInfo = {
      ...paymentInfo,
      maxAmount: BigInt(paymentInfo.maxAmount),
      salt: BigInt(paymentInfo.salt),
    };

    const amounts = await merchant.getPaymentAmounts(parsedPaymentInfo);

    return c.json({
      capturableAmount: amounts.capturableAmount.toString(),
      refundableAmount: amounts.refundableAmount.toString(),
    });
  } catch (error) {
    console.error("[payment-amounts] Error:", error);
    return c.json(
      {
        error: "Failed to get payment amounts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Start server
const port = config.port;
console.log(`\nStarting server on port ${port}...`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("\nEndpoints:");
    console.log(`  GET http://localhost:${port}/         - Health check`);
    console.log(`  GET http://localhost:${port}/info     - Payment info`);
    console.log(
      `  GET http://localhost:${port}/weather  - Weather data (requires payment)`,
    );
    console.log("\nTest payment flow:");
    console.log(`  curl http://localhost:${port}/weather`);
    console.log("  # Returns 402 with payment requirements");
  },
);
