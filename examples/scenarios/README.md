# Scenarios

Multi-role integration scenarios that exercise the full x402r payment lifecycle against a local Anvil fork.

## Prerequisites

- Node >= 22
- pnpm 10.23+
- `x402r-sdk` packages built (`pnpm build` from root)

## Available Scenarios

### happy-path-release

2-role flow: authorize → charge → release.

Demonstrates the simplest payment lifecycle — merchant authorizes a payment, charges funds, waits for escrow expiry, and releases remaining funds.

### dispute-resolution

3-role flow: full lifecycle with arbitration.

Exercises the complete dispute flow:
1. Deploy marketplace operator
2. Authorize payment (HTTP 402 flow)
3. Merchant charges
4. Payer requests refund
5. Both parties submit evidence
6. Arbiter reviews evidence and approves refund
7. Verify refund amounts
8. Distribute protocol fees

## Running

```bash
# From x402r-sdk root
pnpm scenario:release
pnpm scenario:dispute
```

All scenarios run against a local Anvil fork — no real testnet funds needed.
