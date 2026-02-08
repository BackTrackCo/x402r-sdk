import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import type { SchemeRegistration } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { EscrowServerScheme } from "@x402r/evm/escrow/server";
import { refundable } from "@x402r/helpers";
import { loadConfig, createClients, NETWORK_ID } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "..", ".env") });

const config = loadConfig();
const { account } = createClients(config);

const facilitator = new HTTPFacilitatorClient({
  url: config.facilitatorUrl,
});

const app = new Hono();

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
    [{ network: NETWORK_ID, server: new EscrowServerScheme() } as SchemeRegistration],
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

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`Hono merchant server listening at http://localhost:${config.port}`);
});
