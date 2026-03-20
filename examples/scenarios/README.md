# Scenarios

Multi-role integration scenarios that exercise the full x402r payment lifecycle against a local Anvil fork.

## Prerequisites

- Node >= 22
- pnpm 10.23+
- `x402r-sdk` packages built (`pnpm build` from root)

## Available Scenarios

### happy-path-release

2-role flow: authorize → release.

Demonstrates the simplest payment lifecycle — merchant authorizes a payment, charges funds, waits for escrow expiry, and releases remaining funds.

### dispute-resolution

3-role flow: full lifecycle with arbitration.

Exercises the complete dispute flow:
1. Deploy marketplace operator
2. Authorize payment (HTTP 402 flow)
3. Payer requests refund
4. Both parties submit evidence
5. Arbiter reviews evidence and approves refund
6. Verify refund amounts
7. Distribute protocol fees

## Running

```bash
# From x402r-sdk root
pnpm scenario:release
pnpm scenario:dispute
```

All scenarios run against a local Anvil fork — no real testnet funds needed.
