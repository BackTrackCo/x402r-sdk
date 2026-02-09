/**
 * x402r Merchant Server — Hono Example
 *
 * Forked from x402/examples/typescript/servers/hono/index.ts
 * with the following x402 → x402r changes:
 *   - ExactEvmScheme → EscrowServerScheme from @x402r/evm
 *   - SVM support removed (EVM-only)
 *   - Route config wrapped with refundable() from @x402r/helpers
 *   - scheme: "exact" → scheme: "escrow"
 *   - EVM_ADDRESS → PRIVATE_KEY + OPERATOR_ADDRESS env vars
 *   - Price: $0.001 → $0.01
 *
 * Usage:
 *   1. Deploy an operator: PRIVATE_KEY=0x... pnpm example:deploy-operator
 *   2. Copy .env-local to .env and fill in your values
 *   3. Start a facilitator: pnpm example:facilitator
 *   4. Run: pnpm example:server:hono
 *   5. Test: curl http://localhost:4021/weather
 */

import dotenv from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { EscrowServerScheme } from "@x402r/evm/escrow/server";
import { refundable } from "@x402r/helpers";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { privateKeyToAccount } from "viem/accounts";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
const operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;
if (!privateKey || !operatorAddress) {
  console.error("Missing required environment variables: PRIVATE_KEY, OPERATOR_ADDRESS");
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);

const facilitatorUrl = process.env.FACILITATOR_URL;
if (!facilitatorUrl) {
  console.error("FACILITATOR_URL environment variable is required");
  process.exit(1);
}
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

const NETWORK_ID = "eip155:84532";

const app = new Hono();

app.use(
  paymentMiddleware(
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
            operatorAddress,
          ),
        ],
        description: "Weather data",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(
      NETWORK_ID,
      new EscrowServerScheme() as never,
    ),
  ),
);

app.get("/weather", c => {
  return c.json({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

serve({
  fetch: app.fetch,
  port: 4021,
});

console.log(`Server listening at http://localhost:4021`);
