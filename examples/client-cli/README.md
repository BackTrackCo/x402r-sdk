# x402r Client CLI

A command-line tool for making x402r payments, freezing payments, and requesting refunds.

## Prerequisites

- Node.js 20+
- Private key with Base Sepolia ETH and USDC
- A running merchant server (see `../merchant-server`)

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your private key:
   ```
   PRIVATE_KEY=0x...your_private_key...
   ```

3. Fund your wallet:
   - ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
   - USDC: https://faucet.circle.com/ (select Base Sepolia)

## Commands

### Show Configuration
```bash
pnpm start info
```

### Make a Payment
```bash
pnpm start pay --url http://localhost:3000/weather
```

This will:
1. Fetch payment requirements (402 response)
2. Create and sign payment payload
3. Submit payment and receive content
4. Output PaymentInfo JSON for use with other commands

### Check Freeze Status
```bash
pnpm start is-frozen \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --freeze-address 0xD0f99B7667076f151FD8240b277f1765d147e48C \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

### Freeze a Payment
```bash
pnpm start freeze \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --freeze-address 0xD0f99B7667076f151FD8240b277f1765d147e48C \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

### Unfreeze a Payment
```bash
pnpm start unfreeze \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --freeze-address 0xD0f99B7667076f151FD8240b277f1765d147e48C \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

### Request a Refund
```bash
pnpm start refund \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --amount 5000 \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

### Check Refund Status
```bash
pnpm start refund-status \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

### Cancel a Refund Request
```bash
pnpm start cancel-refund \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --operator-address 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
```

## Pre-deployed Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| Operator | `0xbb4f390b80E4F4895B96B95AE382B65fDC45974B` |
| Freeze | `0xD0f99B7667076f151FD8240b277f1765d147e48C` |
| EscrowPeriod | `0xFcFb7e197823D304D53F47BE1E9761e9D102589b` |

## Example Workflow

```bash
# 1. Make a payment
pnpm start pay --url http://localhost:3000/weather
# Save the PaymentInfo JSON from output

# 2. Check if frozen
pnpm start is-frozen --payment-json '...' --freeze-address 0x... --operator-address 0x...

# 3. Freeze the payment (blocks merchant from releasing)
pnpm start freeze --payment-json '...' --freeze-address 0x... --operator-address 0x...

# 4. Request a refund
pnpm start refund --payment-json '...' --amount 5000 --operator-address 0x...

# 5. Check refund status
pnpm start refund-status --payment-json '...' --operator-address 0x...
```
