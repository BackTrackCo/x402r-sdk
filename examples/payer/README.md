# Payer Examples

Examples demonstrating payer-side SDK operations using `createPayerClient()`.

## Available Examples

- **request-refund.ts** — Request a refund for a payment in escrow
- **submit-evidence.ts** — Submit evidence CID for a dispute

## Running

```bash
# From x402r-sdk root
pnpm example:payer:request-refund
pnpm example:payer:submit-evidence
```

## What's Happening

Each example:

1. Starts a local Anvil fork of Base Sepolia
2. Deploys a marketplace operator with all condition contracts
3. Funds the payer with test USDC
4. Authorizes a payment into escrow
5. Runs the example operation
6. Stops Anvil

No wallet or testnet funds required — everything runs locally with deterministic test accounts.
