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
