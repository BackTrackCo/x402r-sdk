import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { EscrowServerScheme } from "@x402r/evm/escrow/server";
import { refundable } from "@x402r/helpers";
import { loadConfig, createAccount, NETWORK_ID } from "./config.js";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const { operatorAddress, facilitatorUrl, port } = loadConfig();
const account = createAccount();

const app = express();

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

app.get("/weather", (_req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.listen(port, () => {
  console.log(`Express merchant server listening at http://localhost:${port}`);
});
