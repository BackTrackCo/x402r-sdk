# x402r Examples Guide

End-to-end demo: Client pays for weather data → Merchant receives payment in escrow → Can release after escrow period.

## Prerequisites

- Node.js 20+, pnpm 9.15+
- Wallet with Base Sepolia ETH and USDC

**Get testnet tokens:**
- ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- USDC: https://faucet.circle.com/ (select Base Sepolia)

## Step 1: Deploy an Operator

Skip this if using the pre-deployed example operator below.

```bash
cd x402r-sdk
PRIVATE_KEY=0x... pnpm example:deploy-operator
```

Save the output addresses for the next steps.

## Step 2: Start the Merchant Server

```bash
cd x402r-sdk/examples/merchant-server
pnpm install
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=0x...your_merchant_private_key...
OPERATOR_ADDRESS=0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
FREEZE_ADDRESS=0xD0f99B7667076f151FD8240b277f1765d147e48C
ESCROW_PERIOD_ADDRESS=0xFcFb7e197823D304D53F47BE1E9761e9D102589b
```

Start:
```bash
# From examples/merchant-server directory:
pnpm dev

# Or from x402r-sdk root:
pnpm example:merchant-server
```

Test it returns 402:
```bash
curl http://localhost:3000/weather
```

## Step 3: Make a Payment

In a new terminal:

```bash
cd x402r-sdk/examples/client-cli
pnpm install
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=0x...your_payer_private_key...
```

Pay for weather data:
```bash
# From examples/client-cli directory:
pnpm start pay --url http://localhost:3000/weather

# Or from x402r-sdk root:
pnpm example:client-cli pay --url http://localhost:3000/weather
```

**Save the Payment Info JSON from the output** - you need it for freeze/refund.

## Step 4: Freeze a Payment (Optional)

Freezing blocks the merchant from releasing funds:

```bash
pnpm start freeze \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --freeze-address 0xD0f99B7667076f151FD8240b277f1765d147e48C \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

Check status:
```bash
pnpm start is-frozen \
  --payment-json '...' \
  --freeze-address 0xD0f99B7667076f151FD8240b277f1765d147e48C \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

## Step 5: Request a Refund (Optional)

```bash
pnpm start refund \
  --payment-json '...' \
  --amount 10000 \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

Check refund status:
```bash
pnpm start refund-status \
  --payment-json '...' \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

## Step 6: Merchant Operations (Using Merchant CLI)

The merchant-cli provides direct access to merchant operations without running a server.

### Setup

```bash
cd x402r-sdk/examples/merchant-cli
pnpm install
cp .env.example .env
# Edit .env with your merchant private key
```

### Release Funds

After the escrow period passes, release funds to the merchant:

```bash
pnpm start release \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --amount 10000
```

### Check Payment Amounts

```bash
pnpm start payment-amounts --payment-json '...'
```

### Approve/Deny Refund Requests

```bash
# List pending refunds
pnpm start pending-refunds

# Approve a refund
pnpm start approve-refund --payment-json '...'

# Or deny it
pnpm start deny-refund --payment-json '...'
```

## Merchant CLI vs Merchant Server

| Aspect | Merchant Server | Merchant CLI |
|--------|-----------------|--------------|
| **Use Case** | Build APIs that accept payments | Manual merchant operations |
| **How it works** | HTTP server with payment middleware | Command-line tool |
| **When to use** | Production services, web apps | Testing, debugging, manual releases |
| **Example** | Weather API that requires payment | Release funds after delivery |

## Reference Addresses (Base Sepolia)

### Example Operator

| Contract | Address |
|----------|---------|
| PaymentOperator | `0xbb4f390b80E4F4895B96B95AE382B65fDC45974B` |
| EscrowPeriod | `0xFcFb7e197823D304D53F47BE1E9761e9D102589b` |
| Freeze | `0xD0f99B7667076f151FD8240b277f1765d147e48C` |

### Protocol Contracts

| Contract | Address |
|----------|---------|
| AuthCaptureEscrow | `0xb9488351E48b23D798f24e8174514F28B741Eb4f` |
| RefundRequest | `0x6926c05193c714ED4bA3867Ee93d6816Fdc14128` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

## CLI Commands Reference

### Client CLI (payer operations)

| Command | Description |
|---------|-------------|
| `pay --url <url>` | Make a payment to a 402 endpoint |
| `freeze --payment-json <json> --freeze-address <addr> --operator-address <addr>` | Freeze a payment |
| `unfreeze ...` | Unfreeze a payment |
| `is-frozen ...` | Check if payment is frozen |
| `refund --payment-json <json> --amount <amt> --operator-address <addr>` | Request refund |
| `refund-status ...` | Check refund request status |
| `cancel-refund ...` | Cancel pending refund request |
| `info` | Show wallet and protocol addresses |

### Merchant CLI (merchant operations)

| Command | Description |
|---------|-------------|
| `release --payment-json <json> --amount <amt>` | Release escrowed funds to merchant |
| `payment-amounts --payment-json <json>` | Check authorized/captured/released amounts |
| `pending-refunds` | List all pending refund requests |
| `approve-refund --payment-json <json>` | Approve a refund request |
| `deny-refund --payment-json <json>` | Deny a refund request |
| `operator-config` | Show operator configuration |
| `info` | Show wallet and protocol addresses |
