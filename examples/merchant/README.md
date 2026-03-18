# Merchant Examples

Examples demonstrating merchant-side SDK operations using `createMerchantClient()`.

## Available Examples

- **charge-payment.ts** — Charge an authorized payment during escrow
- **release-escrow.ts** — Release remaining funds after escrow expires

## Running

```bash
# From x402r-sdk root
pnpm example:merchant:charge
pnpm example:merchant:release
```

## What's Happening

Each example:

1. Starts a local Anvil fork of Base Sepolia
2. Deploys a marketplace operator with all condition contracts
3. Funds the payer with test USDC and authorizes a payment
4. Runs the merchant operation
5. Stops Anvil

No wallet or testnet funds required — everything runs locally with deterministic test accounts.
