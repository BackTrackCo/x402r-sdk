# x402r Facilitator

HTTP service implementing x402's facilitator protocol for escrow-based payments. Holds the wallet key and calls `authorize()` on-chain.

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
   PRIVATE_KEY=0x...your_facilitator_private_key...
   OPERATOR_ADDRESS=0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
   ```

## Running

```bash
pnpm dev
```

Facilitator starts at http://localhost:4022

## Endpoints

### GET /

Health check - returns facilitator info.

### GET /supported

Returns supported payment schemes and networks.

```bash
curl http://localhost:4022/supported
```

Response:

```json
{
  "kinds": [
    {
      "x402Version": 2,
      "scheme": "escrow",
      "network": "eip155:84532",
      "extra": {
        "escrowAddress": "0x...",
        "operatorAddress": "0x...",
        "tokenCollector": "0x...",
        "minFeeBps": 0,
        "maxFeeBps": 1000
      }
    }
  ],
  "extensions": [],
  "signers": { "eip155": ["0xFacilitatorAddress"] }
}
```

### POST /verify

Verify an escrow payment signature.

### POST /settle

Settle a payment on-chain by calling `authorize()` on the PaymentOperator.

## How It Works

The facilitator bridges x402's standard protocol with x402r's escrow contracts:

1. **Merchant server** uses x402's `paymentMiddleware()` + `HTTPFacilitatorClient` pointing to this service
2. When a payment arrives, the middleware calls **POST /verify** to validate the ERC-3009 signature
3. After the handler runs, the middleware calls **POST /settle** which calls `authorize()` on-chain
4. The `extra` fields from **GET /supported** flow through to the merchant's payment requirements

## Quick Start (Full Stack)

```bash
# 1. Deploy operator (one-time setup)
pnpm tsx examples/deploy-operator/index.ts

# 2. Start facilitator (this service — must be running before merchant-server)
cd examples/facilitator && pnpm dev

# 3. Start merchant server (in a new terminal)
cd examples/merchant-server && pnpm dev

# 4. Test
curl http://localhost:3000/weather   # → 402 Payment Required
```

The merchant server connects to this facilitator via `HTTPFacilitatorClient` at `http://localhost:4022`.

## Pre-deployed Addresses (Base Sepolia)

| Contract | Address                                      |
| -------- | -------------------------------------------- |
| Operator | `0xbb4f390b80E4F4895B96B95AE382B65fDC45974B` |
