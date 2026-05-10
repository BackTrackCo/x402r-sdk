# Scenarios

Multi-role integration scenarios that exercise the full x402r payment lifecycle against a local Anvil fork.

## Prerequisites

- Node >= 22
- pnpm 10.23+
- `x402r-sdk` packages built (`pnpm build` from root)

## Available Scenarios

### happy-path-capture

2-role flow: authorize → capture.

Demonstrates the simplest payment lifecycle — merchant authorizes a payment, waits for escrow expiry, and captures.

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

### atomic-charge

2-role flow: payer signs once, merchant calls `payment.charge()` (single tx, no escrow).

Demonstrates the `autoCapture` wire-format flag from `@x402r/evm@0.2.0-alpha.0`. Builds an `extra` via `x402rDefaults({ autoCapture: true })` to document what a merchant would put in their 402 challenge, then atomically charges — funds go straight from payer to receiver, no escrow hold, no separate capture call.

## Running

```bash
# From x402r-sdk root
pnpm scenario:capture
pnpm scenario:dispute
pnpm scenario:atomic-charge
```

All scenarios run against a local Anvil fork — no real testnet funds needed.
