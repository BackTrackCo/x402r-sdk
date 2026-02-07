/**
 * Express Merchant Server Example
 *
 * A simple weather API that requires x402r escrow payments.
 * Uses x402's standard paymentMiddleware + HTTPFacilitatorClient to delegate
 * verify/settle to an x402r facilitator service.
 *
 * This is the Express equivalent of the Hono-based merchant-server example.
 *
 * Usage:
 *   1. Deploy an operator: PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts
 *   2. Copy addresses to .env
 *   3. Start facilitator: cd examples/facilitator && pnpm dev
 *   4. Start merchant: cd examples/express-merchant-server && pnpm dev
 *   5. Test: curl http://localhost:3001/weather
 */

import express from "express";
import cors from "cors";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { EscrowServerScheme } from "@x402r/evm/escrow/server";
import { refundable } from "@x402r/helpers";
import { loadConfig, createClients, NETWORK_ID } from "./config.js";

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

// Initialize configuration
const config = loadConfig();
const { account } = createClients(config);

console.log("Express Merchant Server Configuration:");
console.log("  Address:", account.address);
console.log("  Operator:", config.operatorAddress);
console.log("  Facilitator:", config.facilitatorUrl);
console.log("  Network:", NETWORK_ID);

// Create facilitator client pointing to x402r facilitator service
const facilitator = new HTTPFacilitatorClient({
  url: config.facilitatorUrl,
});

// Create Express app
const app = express();
app.use(cors());

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

// Health check endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "x402r Weather API (Express)",
    version: "1.0.0",
    endpoints: {
      "/": "This endpoint (health check)",
      "/weather": "Get weather data (requires payment)",
      "/info": "Get payment info (no payment required)",
    },
  });
});

// Payment info endpoint (no payment required)
app.get("/info", (_req, res) => {
  res.json({
    network: NETWORK_ID,
    operator: config.operatorAddress,
    merchant: account.address,
    facilitator: config.facilitatorUrl,
  });
});

// Protected weather endpoint
app.get("/weather", (_req, res) => {
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

  res.json(weather);
});

// Start server
const port = config.port;
console.log(`\nStarting server on port ${port}...`);

app.listen(port, () => {
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
});
