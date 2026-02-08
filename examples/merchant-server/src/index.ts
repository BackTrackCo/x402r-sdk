import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { EscrowServerScheme } from "@x402r/evm/escrow/server";
import { refundable } from "@x402r/helpers";
import { loadConfig, createAccount, NETWORK_ID } from "./config.js";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const { operatorAddress, facilitatorUrl, port } = loadConfig();
const account = createAccount();

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
      },
    },
    new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorUrl })).register(
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

serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono merchant server listening at http://localhost:${port}`);
});
