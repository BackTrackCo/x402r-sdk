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
```

## Two Services, Two Concerns

This example uses two separate services:

| Service | Role | Port |
|---------|------|------|
| **Facilitator** (`examples/facilitator`) | Handles x402 payment protocol: verify signatures, settle on-chain via `authorize()` | 4022 |
| **Merchant Server** (this) | Your resource API — serves content behind x402 payment middleware | 3000 |

**Why `HTTPFacilitatorClient`?** — The merchant server uses x402's standard `paymentMiddleware` which delegates signature verification and on-chain settlement to a facilitator service over HTTP. The merchant server itself is a pure resource server — it only serves content, it doesn't handle on-chain operations.

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
```
