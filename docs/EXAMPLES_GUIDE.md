# x402r Examples Guide

End-to-end demo: Client pays for weather data via escrow, Merchant delegates to Facilitator, Facilitator settles on-chain, Merchant releases after escrow period.

## Prerequisites

- Node.js 20+, pnpm 9.15+
- Wallet with Base Sepolia ETH and USDC

**Get testnet tokens:**

- ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- USDC: https://faucet.circle.com/ (select Base Sepolia)

## Step 1: Deploy an Operator

Skip this if using the pre-deployed short-escrow operator below.

```bash
cd x402r-sdk
PRIVATE_KEY=0x... pnpm example:deploy-operator
```

Save the output addresses (PaymentOperator, EscrowPeriod, Freeze) for the next steps.

## Step 2: Start the Facilitator

The facilitator handles payment verification and on-chain settlement. It is **operator-agnostic** — it does not need an operator address. It reads escrow config from the payment requirements at verify/settle time.

```bash
cd x402r-sdk/examples/facilitator/basic
cp .env-local .env
```

Edit `.env`:

```env
PRIVATE_KEY=0x...your_facilitator_private_key...
PORT=4022
```

Start (from x402r-sdk root):

```bash
pnpm example:facilitator
```

The facilitator runs at http://localhost:4022.

Verify it's working:

```bash
curl http://localhost:4022/supported
```

## Step 3: Start the Merchant Server

```bash
cd x402r-sdk/examples/servers/express
cp .env-local .env
```

Edit `.env`:

```env
ADDRESS=0x...your_merchant_wallet_address...
OPERATOR_ADDRESS=0x8140b98ec518843EA1Dd40C42617ACBa71752C33
FACILITATOR_URL=http://localhost:4022
```

Start (from x402r-sdk root):

```bash
pnpm example:server:express
```

The merchant server runs at http://localhost:4021.

Test it returns 402:

```bash
curl http://localhost:4021/weather
```

You should see a 402 response with `accepts` containing the escrow scheme payment requirements, including `operatorAddress` in `extra`.

## Step 4: Make a Payment

```bash
cd x402r-sdk/examples/dev-tools/client-cli
cp .env.example .env
```

Edit `.env`:

```env
PRIVATE_KEY=0x...your_payer_private_key...
```

Pay for weather data (from x402r-sdk root):

```bash
pnpm example:client-cli pay --url http://localhost:4021/weather
```

**Save the Payment Info JSON from the output** — you need it for freeze/refund.

## Step 5: Freeze a Payment (Optional)

Freezing blocks the merchant from releasing funds:

```bash
pnpm example:client-cli freeze \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --freeze-address 0x6d64A0B25A1494f347941614fc8799B486a603A6 \
  --operator-address 0x8140b98ec518843EA1Dd40C42617ACBa71752C33
```

Check status:

```bash
pnpm example:client-cli is-frozen \
  --payment-json '...' \
  --freeze-address 0x6d64A0B25A1494f347941614fc8799B486a603A6 \
  --operator-address 0x8140b98ec518843EA1Dd40C42617ACBa71752C33
```

## Step 6: Request a Refund (Optional)

```bash
pnpm example:client-cli refund \
  --payment-json '...' \
  --amount 10000 \
  --operator-address 0x8140b98ec518843EA1Dd40C42617ACBa71752C33
```

Check refund status:

```bash
pnpm example:client-cli refund-status \
  --payment-json '...' \
  --operator-address 0x8140b98ec518843EA1Dd40C42617ACBa71752C33
```

## Step 7: Arbiter Operations (Dispute Resolution)

The arbiter-cli handles dispute resolution for refund requests.

### Setup

```bash
cd x402r-sdk/examples/dev-tools/arbiter-cli
cp .env.example .env
```

Edit `.env`:

```env
PRIVATE_KEY=0x...your_arbiter_private_key...
OPERATOR_ADDRESS=0x8140b98ec518843EA1Dd40C42617ACBa71752C33
FREEZE_ADDRESS=0x6d64A0B25A1494f347941614fc8799B486a603A6
```

### List Pending Refund Requests

```bash
pnpm example:arbiter-cli list
pnpm example:arbiter-cli list --offset 0 --count 20
```

### View Request Details

```bash
pnpm example:arbiter-cli show 0x1234...abcd
```

### Approve or Deny a Refund

```bash
# Approve
pnpm example:arbiter-cli approve 0x1234...abcd \
  --payment-json '{"operator":"0x...",...}'

# Deny
pnpm example:arbiter-cli deny 0x1234...abcd \
  --payment-json '{"operator":"0x...",...}'
```

### Execute an Approved Refund

```bash
pnpm example:arbiter-cli execute --payment-json '{"operator":"0x...",...}'
```

### Watch for New Requests

Monitor incoming refund requests in real-time:

```bash
pnpm example:arbiter-cli watch
```

## Step 8: Merchant Operations (Using Merchant CLI)

The merchant-cli provides direct access to merchant operations without running a server.

### Setup

```bash
cd x402r-sdk/examples/dev-tools/merchant-cli
cp .env.example .env
```

Edit `.env`:

```env
PRIVATE_KEY=0x...your_merchant_private_key...
OPERATOR_ADDRESS=0x8140b98ec518843EA1Dd40C42617ACBa71752C33
FREEZE_ADDRESS=0x6d64A0B25A1494f347941614fc8799B486a603A6
```

### Release Funds

After the escrow period passes, release funds to the merchant:

```bash
pnpm example:merchant-cli release \
  --payment-json '{"operator":"0x...","payer":"0x...",...}' \
  --amount 10000
```

### Check Payment Amounts

```bash
pnpm example:merchant-cli payment-amounts --payment-json '...'
```

### Approve/Deny Refund Requests

```bash
# List pending refunds
pnpm example:merchant-cli pending-refunds

# Approve a refund
pnpm example:merchant-cli approve-refund --payment-json '...'

# Or deny it
pnpm example:merchant-cli deny-refund --payment-json '...'
```

## Merchant CLI vs Merchant Server

| Aspect           | Merchant Server                     | Merchant CLI                        |
| ---------------- | ----------------------------------- | ----------------------------------- |
| **Use Case**     | Build APIs that accept payments     | Manual merchant operations          |
| **How it works** | HTTP server with payment middleware | Command-line tool                   |
| **When to use**  | Production services, web apps       | Testing, debugging, manual releases |
| **Example**      | Weather API that requires payment   | Release funds after delivery        |

## Reference Addresses (Base Sepolia)

### Short-Escrow Operator (for E2E testing)

5min escrow, 3min freeze window, 1% fee.

| Contract        | Address                                      |
| --------------- | -------------------------------------------- |
| PaymentOperator | `0x8140b98ec518843EA1Dd40C42617ACBa71752C33` |
| EscrowPeriod    | `0x0402f5b49126786c01c3e0885767bB11C0199372` |
| Freeze          | `0x6d64A0B25A1494f347941614fc8799B486a603A6` |

### Protocol Contracts

Source of truth: `packages/core/src/config/index.ts`

| Contract          | Address                                      |
| ----------------- | -------------------------------------------- |
| AuthCaptureEscrow | `0x29025c0E9D4239d438e169570818dB9FE0A80873` |
| TokenCollector    | `0x5cA789000070DF15b4663DB64a50AeF5D49c5Ee0` |
| RefundRequest     | `0x1C2Ab244aC8bDdDB74d43389FF34B118aF2E90F4` |
| ProtocolFeeConfig | `0x8F96C493bAC365E41f0315cf45830069EBbDCaCe` |
| ArbiterRegistry   | `0x762d562a5ff10EcbFD2Bc4fea663433b84226F35` |
| USDC              | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

## Directory Structure

```
examples/
├── deploy-operator/           # Deploy a new operator (pnpm example:deploy-operator)
├── facilitator/
│   └── basic/                 # Facilitator server (pnpm example:facilitator)
├── servers/
│   ├── express/               # Express merchant server (pnpm example:server:express)
│   └── hono/                  # Hono merchant server (pnpm example:server:hono)
└── dev-tools/
    ├── client-cli/            # Payer CLI (pnpm example:client-cli)
    ├── merchant-cli/          # Merchant CLI (pnpm example:merchant-cli)
    ├── arbiter-cli/           # Arbiter CLI (pnpm example:arbiter-cli)
    └── shared/                # Shared utilities
```

## CLI Commands Reference

### Client CLI (payer operations)

| Command                                                                          | Description                        |
| -------------------------------------------------------------------------------- | ---------------------------------- |
| `pay --url <url>`                                                                | Make a payment to a 402 endpoint   |
| `freeze --payment-json <json> --freeze-address <addr> --operator-address <addr>` | Freeze a payment                   |
| `unfreeze ...`                                                                   | Unfreeze a payment                 |
| `is-frozen ...`                                                                  | Check if payment is frozen         |
| `refund --payment-json <json> --amount <amt> --operator-address <addr>`          | Request refund                     |
| `refund-status ...`                                                              | Check refund request status        |
| `cancel-refund ...`                                                              | Cancel pending refund request      |
| `preview-fee --operator-address <addr> --amount <amt>`                           | Preview fees before paying         |
| `info`                                                                           | Show wallet and protocol addresses |

### Merchant CLI (merchant operations)

| Command                                        | Description                                |
| ---------------------------------------------- | ------------------------------------------ |
| `release --payment-json <json> --amount <amt>` | Release escrowed funds to merchant         |
| `payment-amounts --payment-json <json>`        | Check authorized/captured/released amounts |
| `pending-refunds`                              | List all pending refund requests           |
| `approve-refund --payment-json <json>`         | Approve a refund request                   |
| `deny-refund --payment-json <json>`            | Deny a refund request                      |
| `calculate-fee --amount <amt>`                 | Calculate fees for an amount               |
| `operator-config`                              | Show operator configuration                |
| `info`                                         | Show wallet and protocol addresses         |

### Arbiter CLI (dispute resolution)

| Command                               | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `list`                                | List pending refund requests               |
| `show <key>`                          | Show detailed request info                 |
| `approve <key> --payment-json <json>` | Approve a refund request                   |
| `deny <key> --payment-json <json>`    | Deny a refund request                      |
| `execute --payment-json <json>`       | Execute an approved refund                 |
| `status --payment-json <json>`        | Check refund request status                |
| `is-frozen --payment-json <json>`     | Check if payment is frozen                 |
| `watch`                               | Watch for new refund requests in real-time |
| `count`                               | Get total refund request count             |
| `info`                                | Show arbiter wallet and config             |

## Known Issues

### `@x402/core` extra field passthrough bug

`@x402/core@2.3.0` has a bug where `buildPaymentRequirementsFromOptions()` drops the `extra` field from payment options. This means escrow-specific config (`operatorAddress`, `escrowAddress`, etc.) set by `refundable()` never reaches the 402 response or the verification path.

**Workaround:** A pnpm patch is applied in this repo (`patches/@x402__core@2.3.0.patch`) that adds `extra: option.extra` to the `resourceConfig` construction in both CJS and ESM builds.

**Upstream:** Fix submitted to `coinbase/x402` — adds `extra` to the inline parameter type and passes it through to `ResourceConfig` in `buildPaymentRequirementsFromOptions()`.

**Impact without patch:** `GET /weather` returns 402 but `extra` is empty — the client cannot construct a valid escrow payment because `operatorAddress` and other required fields are missing.
