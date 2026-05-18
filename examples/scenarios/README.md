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
2. Authorize payment via SDK viem flow
3. Payer requests refund
4. Both parties submit evidence
5. Arbiter reviews evidence and approves refund
6. Verify refund amounts
7. Distribute protocol fees

### atomic-charge

2-role flow: payer signs once, merchant calls `payment.charge()` (single tx, no escrow).

Demonstrates the atomic settlement path. In production the merchant advertises this intent via `PaymentRequirements.extra.autoCapture`; the facilitator reads the flag and dispatches to `escrow.charge()` vs `escrow.authorize()`. Asserts real ERC-20 balance deltas (payer ↓ amount, receiver + fee ↑ to total).

### partial-refund-flow

2-role flow: authorize → capture(partial) → voidPayment().

The new authCapture partial-refund pattern. Replaces the old single-tx `refundInEscrow(amount)` with a two-tx flow: merchant captures the amount they keep, then `voidPayment()` returns the remainder to the payer. No allowance setup, no ReceiverRefundCollector — the escrow handles it. Asserts payer net loss equals merchant-keep, receiver delta + fee delta equals merchant-keep.

## Running

```bash
# From x402r-sdk root
pnpm scenario:capture
pnpm scenario:dispute
pnpm scenario:atomic-charge
pnpm scenario:partial-refund-flow
```

All scenarios run against a local Anvil fork — no real testnet funds needed.
