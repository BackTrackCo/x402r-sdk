# x402r SDK Examples

Runnable examples demonstrating every SDK operation by role (payer, merchant, arbiter) and multi-role integration scenarios.

## Quick Start (no wallet needed)

```bash
cd x402r-sdk
pnpm install && pnpm build
pnpm example:payer:request-refund
```

Per-action examples start a local Anvil fork, deploy contracts, and run the example — zero config required.

## Examples

### Payer

| Example | Description |
|---------|-------------|
| [`payer/request-refund.ts`](payer/request-refund.ts) | Request a refund for a payment in escrow |
| [`payer/submit-evidence.ts`](payer/submit-evidence.ts) | Submit evidence CID for a dispute |

### Merchant

| Example | Description |
|---------|-------------|
| [`merchant/charge-payment.ts`](merchant/charge-payment.ts) | Charge an authorized payment |
| [`merchant/release-escrow.ts`](merchant/release-escrow.ts) | Release remaining funds after escrow expires |
| [`merchant/distribute-fees.ts`](merchant/distribute-fees.ts) | Distribute accumulated protocol fees |

### Arbiter

| Example | Description |
|---------|-------------|
| [`arbiter/approve-refund.ts`](arbiter/approve-refund.ts) | Approve a payer's refund request |
| [`arbiter/freeze-payment.ts`](arbiter/freeze-payment.ts) | Freeze a payment during investigation |
| [`arbiter/review-evidence.ts`](arbiter/review-evidence.ts) | Review all submitted evidence |

### Scenarios (Base Sepolia)

Multi-role integration scenarios running against a local Anvil fork.

| Scenario | Description |
|----------|-------------|
| [`scenarios/happy-path-release.ts`](scenarios/happy-path-release.ts) | authorize → charge → release (2 roles) |
| [`scenarios/dispute-resolution.ts`](scenarios/dispute-resolution.ts) | Full lifecycle with arbitration (3 roles) |

See [`scenarios/README.md`](scenarios/README.md) for details.

## Setup

```bash
# From x402r-sdk root
pnpm install
pnpm build
```

Per-action examples use a local Anvil fork — no wallet or testnet funds needed. Anvil is started automatically and uses deterministic test accounts.

## Running

```bash
# Per-action examples (start anvil, run, stop)
pnpm example:payer:request-refund
pnpm example:merchant:charge
pnpm example:arbiter:approve-refund

# Scenarios
pnpm scenario:release
pnpm scenario:dispute
```

## A Note on Private Keys

For scenarios that target real testnets (not included yet, but planned):

- **NEVER** use mainnet-funded keys
- Generate test keys: `cast wallet new`
- Fund via [CDP Faucet](https://portal.cdp.coinbase.com/products/faucet)
