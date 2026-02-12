# x402r Arbiter CLI

A command-line tool for arbiter operations in the x402r refundable payments protocol.

## Features

- List pending refund requests
- Approve or deny refund requests (with evidence summary)
- Execute approved refunds
- Watch for new refund requests in real-time
- Check payment freeze status
- View and submit dispute evidence
- Manage arbiter registry (register, deregister, update URI)

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your configuration:
   ```bash
   # Your arbiter wallet private key
   PRIVATE_KEY=0x...

   # The PaymentOperator address this arbiter serves
   OPERATOR_ADDRESS=0x...

   # Optional: Freeze contract address
   FREEZE_ADDRESS=0x...

   # Optional: Receiver address to query (defaults to your wallet)
   RECEIVER_ADDRESS=0x...
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

## Usage

### Show arbiter info
```bash
pnpm start info
```

### List pending refund requests
```bash
pnpm start list
pnpm start list --offset 10 --count 20
```

### Show request details
```bash
pnpm start show 0x1234...abcd
```

### Check refund status
```bash
pnpm start status --payment-json '{"operator":"0x...",...}'
```

### Approve a refund request
```bash
pnpm start approve 0x1234...abcd --payment-json '{"operator":"0x...",...}'
```

### Deny a refund request
```bash
pnpm start deny 0x1234...abcd --payment-json '{"operator":"0x...",...}'
```

### Execute an approved refund
```bash
pnpm start execute --payment-json '{"operator":"0x...",...}'
pnpm start execute --payment-json '{"operator":"0x...",...}' --amount 500000
```

### Watch for new requests
```bash
pnpm start watch
```

### Check if payment is frozen
```bash
pnpm start is-frozen --payment-json '{"operator":"0x...",...}'
```

### Get request count
```bash
pnpm start count
```

### Show evidence for a dispute
```bash
pnpm start show-evidence --payment-json '{"operator":"0x...",...}'
```

### Submit evidence as arbiter
```bash
pnpm start submit-evidence --payment-json '{"operator":"0x...",...}' --cid QmYourIpfsCid
```

### Register as arbiter
```bash
pnpm start register --uri https://arbiter.example.com
```

### Update arbiter URI
```bash
pnpm start update-uri --uri https://new-arbiter.example.com
```

### Deregister as arbiter
```bash
pnpm start deregister
```

### List registered arbiters
```bash
pnpm start registry-list --offset 0 --count 10
```

### Check arbiter registration
```bash
pnpm start registry-check --address 0x...
```

## Payment Info JSON Format

The `--payment-json` parameter expects a JSON object with the following fields:

```json
{
  "operator": "0x...",
  "payer": "0x...",
  "receiver": "0x...",
  "token": "0x...",
  "maxAmount": "1000000",
  "preApprovalExpiry": 0,
  "authorizationExpiry": 1735689600,
  "refundExpiry": 1738368000,
  "minFeeBps": 0,
  "maxFeeBps": 500,
  "feeReceiver": "0x...",
  "salt": "12345"
}
```

You can get this JSON from the client CLI when making a payment.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Arbiter wallet private key |
| `OPERATOR_ADDRESS` | Yes | PaymentOperator contract address |
| `FREEZE_ADDRESS` | No | Freeze contract address |
| `RECEIVER_ADDRESS` | No | Receiver to query (defaults to wallet) |
