# x402r Merchant Server

A sample weather API that accepts x402r escrow payments.

## Prerequisites

- Node.js 20+
- Private key with Base Sepolia ETH (for gas)
- A deployed operator (see `../deploy-operator`)

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
   FREEZE_ADDRESS=0xD0f99B7667076f151FD8240b277f1765d147e48C
   ESCROW_PERIOD_ADDRESS=0xFcFb7e197823D304D53F47BE1E9761e9D102589b
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
- Network, operator, merchant addresses
- Price and payment requirements

### GET /weather
**Requires payment** - Returns weather data.

Without payment header → 402 with payment requirements
With valid X-Payment header → Weather JSON

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

| Contract | Address |
|----------|---------|
| Operator | `0xbb4f390b80E4F4895B96B95AE382B65fDC45974B` |
| Freeze | `0xD0f99B7667076f151FD8240b277f1765d147e48C` |
| EscrowPeriod | `0xFcFb7e197823D304D53F47BE1E9761e9D102589b` |

## Example Flow

```bash
# Terminal 1: Start merchant server
pnpm start

# Terminal 2: Test the API
curl http://localhost:3000/info

# Make a payment using client-cli
cd ../client-cli
pnpm start pay --url http://localhost:3000/weather

# After escrow period, release funds
curl -X POST http://localhost:3000/release \
  -H "Content-Type: application/json" \
  -d '{"paymentInfo": {...}, "amount": "10000"}'
```

## Architecture

```
Client                    Merchant Server              Blockchain
  |                            |                           |
  |-- GET /weather ----------->|                           |
  |<-- 402 + requirements -----|                           |
  |                            |                           |
  |-- GET /weather + X-Payment>|                           |
  |                            |-- verify signature ------>|
  |                            |-- authorize (settle) ---->|
  |<-- 200 + weather data -----|                           |
  |                            |                           |
  |      (escrow period)       |                           |
  |                            |                           |
  |                            |-- POST /release --------->|
  |                            |<-- funds transferred -----|
```
