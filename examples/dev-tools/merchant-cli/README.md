# x402r Merchant CLI

A command-line tool for merchant operations: releasing funds, managing refunds, and viewing operator configuration.

## Prerequisites

- Node.js 20+
- Private key with Base Sepolia ETH (for gas)
- A deployed operator (see `../deploy-operator`)

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration:
   ```
   PRIVATE_KEY=0x...your_merchant_private_key...
   OPERATOR_ADDRESS=0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
   FREEZE_ADDRESS=0xD0f99B7667076f151FD8240b277f1765d147e48C
   ```

3. Fund your wallet with ETH for gas:
   - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

## Payment State

All commands that accept `--payment-json` will automatically read from `~/.x402r/last-payment.json` if the flag is omitted. This file is saved by the client-cli `pay` command. You can still pass `--payment-json` explicitly to override.

## Commands

### Show Configuration
```bash
pnpm start info
```

### Get Operator Configuration
```bash
pnpm start operator-config
```

### Check Payment Amounts
```bash
# Uses saved state from client-cli pay
pnpm start payment-amounts

# Or with explicit payment JSON
pnpm start payment-amounts \
  --payment-json '{"operator":"0x...","payer":"0x...",...}'
```

### Release Funds from Escrow
```bash
pnpm start release --amount 10000
```

### Refund Funds in Escrow
```bash
pnpm start refund-in-escrow --amount 5000
```

### Check Refund Status
```bash
pnpm start refund-status
```

### Approve a Refund Request
```bash
pnpm start approve-refund
```

### Deny a Refund Request
```bash
pnpm start deny-refund
```

### List Pending Refund Requests
```bash
pnpm start pending-refunds --offset 0 --count 10
```

### Check if Payment is Frozen
```bash
pnpm start is-frozen \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --freeze-address 0xD0f99B7667076f151FD8240b277f1765d147e48C
```

### Unfreeze a Payment
```bash
pnpm start unfreeze \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --freeze-address 0xD0f99B7667076f151FD8240b277f1765d147e48C
```

### Show Evidence for a Dispute
```bash
pnpm start show-evidence \
  --payment-json '{"operator":"0x...","payer":"0x...",...}'
```

### Submit Evidence as Merchant
```bash
pnpm start submit-evidence \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --cid QmYourIpfsCid
```

### Calculate Fees
Calculate the fee breakdown for a payment amount:
```bash
pnpm start calculate-fee --amount 10000000
```

Output:
```
Fee Breakdown:
  Protocol Fee: 50 bps (0.50%) = 0.050000 USDC
  Operator Fee: 100 bps (1.00%) = 0.100000 USDC
  Total Fee:    150 bps (1.50%) = 0.150000 USDC
  Net Amount:   9.850000 USDC
```

Validate against payment bounds:
```bash
pnpm start calculate-fee \
  --amount 10000000 \
  --payment-json '{"operator":"0x...","minFeeBps":0,"maxFeeBps":200,...}'
```

## Pre-deployed Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| Operator | `0xbb4f390b80E4F4895B96B95AE382B65fDC45974B` |
| Freeze | `0xD0f99B7667076f151FD8240b277f1765d147e48C` |
| EscrowPeriod | `0xFcFb7e197823D304D53F47BE1E9761e9D102589b` |

## Example Workflow

```bash
# 1. Client makes a payment (using client-cli)
cd ../client-cli
pnpm start pay --url http://localhost:3000/weather
# Save the PaymentInfo JSON from output

# 2. Merchant checks payment amounts
cd ../merchant-cli
pnpm start payment-amounts --payment-json '...'
# Output: Capturable: 10000, Refundable: 0

# 3. After escrow period, merchant releases funds
pnpm start release --payment-json '...' --amount 10000
# Output: Release successful! TX: 0x...

# 4. Verify amounts after release
pnpm start payment-amounts --payment-json '...'
# Output: Capturable: 0, Refundable: 10000
```

## Handling Refund Requests

```bash
# 1. Client requests a refund (using client-cli)
cd ../client-cli
pnpm start refund --payment-json '...' --amount 5000

# 2. Merchant checks pending refunds
cd ../merchant-cli
pnpm start pending-refunds

# 3. Merchant checks specific refund status
pnpm start refund-status --payment-json '...'

# 4. Merchant approves or denies
pnpm start approve-refund --payment-json '...'
# OR
pnpm start deny-refund --payment-json '...'
```

## Comparison with Client CLI

| Operation | Client CLI | Merchant CLI |
|-----------|------------|--------------|
| Make payment | `pay` | - |
| Freeze | `freeze` | - |
| Unfreeze | `unfreeze` | `unfreeze` |
| Check frozen | `is-frozen` | `is-frozen` |
| Request refund | `refund` | - |
| Cancel refund | `cancel-refund` | - |
| Check refund status | `refund-status` | `refund-status` |
| Approve refund | - | `approve-refund` |
| Deny refund | - | `deny-refund` |
| Release funds | - | `release` |
| Refund in escrow | - | `refund-in-escrow` |
| Payment amounts | - | `payment-amounts` |
| Operator config | - | `operator-config` |
| Calculate fees | `preview-fee` | `calculate-fee` |
| Submit evidence | `submit-evidence` | `submit-evidence` |
| View evidence | `show-evidence` | `show-evidence` |
