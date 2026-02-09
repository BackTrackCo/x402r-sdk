# @x402r/express Merchant Server Example

Express.js server demonstrating how to protect API endpoints with a refundable paywall using the `@x402/express` middleware and x402r escrow scheme.

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { EscrowServerScheme } from "@x402r/evm/escrow/server";
import { refundable } from "@x402r/helpers";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(privateKey);
const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: [
          refundable(
            { scheme: "escrow", price: "$0.01", network: "eip155:84532", payTo: account.address },
            operatorAddress,
          ),
        ],
        description: "Weather data",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorUrl }))
      .register("eip155:84532", new EscrowServerScheme() as never),
  ),
);

app.get("/weather", (req, res) => res.json({ weather: "sunny", temperature: 70 }));
```

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- pnpm v9+ (install via [pnpm.io/installation](https://pnpm.io/installation))
- A deployed PaymentOperator contract (run `pnpm example:deploy-operator`)
- A running x402r facilitator (run `pnpm example:facilitator`)

## Setup

1. Copy `.env-local` to `.env`:

```bash
cp .env-local .env
```

and fill required environment variables:

- `PRIVATE_KEY` - Private key for the merchant account
- `OPERATOR_ADDRESS` - Deployed PaymentOperator contract address
- `FACILITATOR_URL` - Facilitator endpoint URL (default: `http://localhost:4022`)

2. Install dependencies from the SDK root:

```bash
cd ../../../
pnpm install
```

3. Run the server:

```bash
pnpm example:server:express
```

## Testing the Server

```bash
curl http://localhost:4021/weather
```

This will return a 402 Payment Required response with escrow payment requirements.

## Example Endpoint

The server includes a single example endpoint at `/weather` that requires a payment of 0.01 USDC on Base Sepolia to access. The endpoint returns a simple weather report.

## Response Format

### Payment Required (402)

```
HTTP/1.1 402 Payment Required
Content-Type: application/json; charset=utf-8
PAYMENT-REQUIRED: <base64-encoded JSON>

{}
```

The `PAYMENT-REQUIRED` header contains base64-encoded JSON with the payment requirements.
Note: `amount` is in atomic units (e.g., 10000 = 0.01 USDC, since USDC has 6 decimals):

```json
{
  "x402Version": 2,
  "error": "Payment required",
  "resource": {
    "url": "http://localhost:4021/weather",
    "description": "Weather data",
    "mimeType": "application/json"
  },
  "accepts": [
    {
      "scheme": "escrow",
      "network": "eip155:84532",
      "amount": "10000",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "payTo": "0x...",
      "maxTimeoutSeconds": 300,
      "extra": {
        "name": "USDC",
        "version": "2",
        "resourceUrl": "http://localhost:4021/weather",
        "escrowAddress": "0x...",
        "operatorAddress": "0x...",
        "tokenCollector": "0x...",
        "minFeeBps": 0,
        "maxFeeBps": 1000
      }
    }
  ]
}
```

### Successful Response

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
PAYMENT-RESPONSE: <base64-encoded JSON>

{"report":{"weather":"sunny","temperature":70}}
```

## Extending the Example

To add more paid endpoints, follow this pattern:

```typescript
import { refundable } from "@x402r/helpers";

app.use(
  paymentMiddleware(
    {
      "GET /your-endpoint": {
        accepts: [
          refundable(
            {
              scheme: "escrow",
              price: "$0.10",
              network: "eip155:84532",
              payTo: account.address,
            },
            operatorAddress,
          ),
        ],
        description: "Your endpoint description",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// Then define your routes as normal
app.get("/your-endpoint", (req, res) => {
  res.json({
    // Your response data
  });
});
```

**Network identifiers** use [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md) format, for example:

- `eip155:84532` — Base Sepolia
- `eip155:8453` — Base Mainnet

## x402ResourceServer Config

The `x402ResourceServer` uses a builder pattern to register payment schemes that declare how payments for each network should be processed:

```typescript
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new EscrowServerScheme() as never);
```

## Facilitator Config

The `HTTPFacilitatorClient` connects to a facilitator service that verifies and settles payments on-chain:

```typescript
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
```
