# x402r SDK Examples

Runnable examples demonstrating every SDK operation by role (payer, merchant, arbiter) and multi-role integration scenarios.

## Quick Start

```bash
cd x402r-sdk
pnpm install && pnpm build
pnpm example:payer:request-refund
```

Each example starts a local Anvil fork, deploys contracts, and runs — no wallet or testnet funds needed.

## Examples

### Payer

| Example | Description |
|---------|-------------|
| [`payer/request-refund.ts`](payer/request-refund.ts) | Request a refund for a payment in escrow |
| [`payer/submit-evidence.ts`](payer/submit-evidence.ts) | Submit evidence CID for a dispute |
| [`payer/freeze-payment.ts`](payer/freeze-payment.ts) | Freeze a payment to block release during investigation |

### Merchant

| Example | Description |
|---------|-------------|
| [`merchant/charge-payment.ts`](merchant/charge-payment.ts) | Charge an authorized payment |
| [`merchant/release-escrow.ts`](merchant/release-escrow.ts) | Release remaining funds after escrow expires |

### Arbiter

| Example | Description |
|---------|-------------|
| [`arbiter/approve-refund.ts`](arbiter/approve-refund.ts) | Approve a payer's refund request |
| [`arbiter/review-evidence.ts`](arbiter/review-evidence.ts) | Review all submitted evidence |
| [`arbiter/distribute-fees.ts`](arbiter/distribute-fees.ts) | Distribute accumulated protocol fees |

### Scenarios

Multi-role integration scenarios running against a local Anvil fork.

| Scenario | Description |
|----------|-------------|
| [`scenarios/happy-path-release.ts`](scenarios/happy-path-release.ts) | authorize → charge → release (2 roles) |
| [`scenarios/dispute-resolution.ts`](scenarios/dispute-resolution.ts) | Full lifecycle with arbitration (3 roles) |

See [`scenarios/README.md`](scenarios/README.md) for details.

## Running

```bash
# Per-action examples
pnpm example:payer:request-refund
pnpm example:merchant:charge
pnpm example:arbiter:approve-refund

# Scenarios
pnpm scenario:release
pnpm scenario:dispute
```
