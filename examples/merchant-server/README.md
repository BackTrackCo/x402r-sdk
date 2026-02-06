# x402r Merchant Server

A sample weather API that accepts x402r escrow payments via x402's standard middleware.

## Prerequisites

- Node.js 20+
- Private key with Base Sepolia ETH (for gas)
- A deployed operator (see `../deploy-operator`)
- A running facilitator service (see `../facilitator`)

## Setup

1. Deploy an operator (if you don't have one):

   ```bash
   cd ../deploy-operator
   PRIVATE_KEY=0x... pnpm start
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your configuration:

   ```
   PRIVATE_KEY=0x...your_merchant_private_key...
   OPERATOR_ADDRESS=0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
   FACILITATOR_URL=http://localhost:4022
   ```

4. Start the facilitator service first:
   ```bash
   cd ../facilitator
   cp .env.example .env
   # Edit .env with same PRIVATE_KEY and OPERATOR_ADDRESS
   pnpm dev
   ```

## Running

```bash
pnpm start
```

Server starts at http://localhost:3000

## Endpoints

### GET /

Health check - returns API info and available endpoints.

### GET /info

Returns payment configuration (no payment required):

- Network, operator, merchant, facilitator URL

### GET /weather

**Requires payment** - Returns weather data.

Without payment header → 402 with payment requirements
With valid Payment-Signature header → Weather JSON

### POST /release

Release funds from escrow to the merchant wallet.

```bash
curl -X POST http://localhost:3000/release \
  -H "Content-Type: application/json" \
  -d '{
    "paymentInfo": {
      "operator": "0x...",
      "payer": "0x...",
      "receiver": "0x...",
      "token": "0x...",
      "maxAmount": "10000",
      "preApprovalExpiry": 281474976710655,
      "authorizationExpiry": 281474976710655,
      "refundExpiry": 281474976710655,
      "minFeeBps": 0,
      "maxFeeBps": 1000,
      "feeReceiver": "0x...",
      "salt": "0x..."
    },
    "amount": "10000"
  }'
```

### POST /payment-amounts

Get capturable and refundable amounts for a payment.

```bash
curl -X POST http://localhost:3000/payment-amounts \
  -H "Content-Type: application/json" \
  -d '{
    "paymentInfo": { ... }
  }'
```

## Pre-deployed Addresses (Base Sepolia)

| Contract | Address                                      |
| -------- | -------------------------------------------- |
| Operator | `0xbb4f390b80E4F4895B96B95AE382B65fDC45974B` |

## Example Flow

```bash
# Terminal 1: Start facilitator
cd ../facilitator
pnpm dev

# Terminal 2: Start merchant server
pnpm start

# Terminal 3: Test the API
curl http://localhost:3000/info

# Make a payment using client-cli
cd ../client-cli
pnpm start pay --url http://localhost:3000/weather

# After escrow period, release funds
curl -X POST http://localhost:3000/release \
  -H "Content-Type: application/json" \
  -d '{"paymentInfo": {...}, "amount": "10000"}'
```

## Two Services, Two Concerns

This example uses two separate services:

| Service | Role | Port |
|---------|------|------|
| **Facilitator** (`examples/facilitator`) | Handles x402 payment protocol: verify signatures, settle on-chain via `authorize()` | 4022 |
| **Merchant Server** (this) | Your API + post-payment operations: release escrowed funds, handle refunds | 3000 |

**Why `HTTPFacilitatorClient`?** — The merchant server uses x402's standard `paymentMiddleware` which delegates signature verification and on-chain settlement to a facilitator service over HTTP.

**Why `X402rMerchant`?** — After payment is settled, the merchant needs to manage escrowed funds: release them after the escrow period, check capturable amounts, or respond to refund requests. `X402rMerchant` handles these post-payment operations directly on-chain.

## Architecture

```
Client                    Merchant Server          Facilitator           Blockchain
  |                            |                       |                     |
  |-- GET /weather ----------->|                       |                     |
  |                            |-- GET /supported ---->|                     |
  |<-- 402 + requirements -----|                       |                     |
  |                            |                       |                     |
  |-- GET /weather + Payment ->|                       |                     |
  |                            |-- POST /verify ------>|                     |
  |                            |<-- isValid: true -----|                     |
  |                            |                       |                     |
  |                            |   (handler runs)      |                     |
  |                            |                       |                     |
  |                            |-- POST /settle ------>|                     |
  |                            |                       |-- authorize() ----->|
  |                            |                       |<-- tx hash ---------|
  |<-- 200 + weather data -----|<-- success + tx ------|                     |
  |                            |                       |                     |
  |      (escrow period)       |                       |                     |
  |                            |                       |                     |
  |                            |-- POST /release --------------------------------->|
  |                            |<-- funds transferred -----------------------------|
```
