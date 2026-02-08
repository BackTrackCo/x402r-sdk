import express from "express";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { paymentMiddlewareFromConfig } from "@x402/express";
import type { SchemeRegistration } from "@x402/express";
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

const app = express();

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

app.get("/weather", (_req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.listen(config.port, () => {
  console.log(`Express merchant server listening at http://localhost:${config.port}`);
});
