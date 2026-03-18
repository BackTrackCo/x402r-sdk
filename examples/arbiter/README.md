# Arbiter Examples

Examples demonstrating arbiter-side SDK operations using `createArbiterClient()`.

## Available Examples

- **approve-refund.ts** — Approve a payer's refund request
- **freeze-payment.ts** — Freeze a payment during investigation
- **review-evidence.ts** — Review all submitted evidence for a dispute

## Running

```bash
# From x402r-sdk root
pnpm example:arbiter:approve-refund
pnpm example:arbiter:freeze
pnpm example:arbiter:review-evidence
```

## What's Happening

Each example:

1. Starts a local Anvil fork of Base Sepolia
2. Deploys a marketplace operator with all condition contracts
3. Funds the payer with test USDC and authorizes a payment
4. Runs the arbiter operation
5. Stops Anvil

No wallet or testnet funds required — everything runs locally with deterministic test accounts.
