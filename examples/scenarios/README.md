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
7. Verify zero protocol fees accrued

### atomic-charge

2-role flow: payer signs once, merchant calls `payment.charge()` (single tx, no escrow).

Demonstrates the atomic settlement path. In production the merchant advertises this intent via `PaymentRequirements.extra.autoCapture`; the facilitator reads the flag and dispatches to `escrow.charge()` vs `escrow.authorize()`. Asserts real ERC-20 balance deltas (payer ↓ amount, receiver + fee ↑ to total).

### partial-refund-flow

2-role flow: authorize → capture(partial) → voidPayment().

The new auth-capture partial-refund pattern. Replaces the old single-tx `refundInEscrow(amount)` with a two-tx flow: merchant captures the amount they keep, then `voidPayment()` returns the remainder to the payer. No allowance setup, no ReceiverRefundCollector — the escrow handles it. Asserts payer net loss equals merchant-keep, receiver delta + fee delta equals merchant-keep.

### permit2-charge

2-role atomic-charge flow routed through Uniswap Permit2 instead of EIP-3009.

Demonstrates the two payer-side moves Permit2 requires: a one-time `ERC20.approve(PERMIT2, MAX)` so the canonical Permit2 contract can pull tokens for any Permit2 spender, then a per-payment `signPermit2Authorization(...)` that the merchant consumes via `payment.charge()`. Asserts payer ↓ amount, receiver Δ + fee Δ === amount, fee Δ > 0.

### http-wire-capture

Cross-package integration test exercising the real HTTP 402 wire end-to-end against an in-process facilitator and resource server.

Boots `@x402/express`'s `paymentMiddleware` + `x402ResourceServer` (with `AuthCaptureEvmScheme` from `@x402r/evm/auth-capture/server`) on one port, `@x402/core`'s `x402Facilitator` (with `AuthCaptureEvmScheme` from `@x402r/evm/auth-capture/facilitator`) on another, and a payer client using `@x402/fetch`'s `wrapFetchWithPayment` + `AuthCaptureEvmScheme` from `@x402/evm/auth-capture/client`. The payer's `fetch` returns HTTP 402, the wrapper signs an authorization, retries, and the facilitator settles on-chain. Asserts the settle tx targets the canonical AuthCaptureEscrow, payer ↓ amount, receiver unchanged (autoCapture left unset), the `PaymentAuthorized` event's `paymentInfo` fields match the resource server's published requirements, and `paymentState(paymentInfoHash)` on the escrow has `hasCollectedPayment === true` and `capturableAmount === amount`.

This is the only scenario that exercises the `@x402/express` ↔ `@x402r/evm` integration seam — wire-format mismatches, scheme registration drift, or signer-interface changes between the upstream packages and `@x402r/evm` surface here and nowhere else in the suite.

## Running

```bash
# From x402r-sdk root
pnpm scenario:capture
pnpm scenario:dispute
pnpm scenario:atomic-charge
pnpm scenario:partial-refund-flow
pnpm scenario:permit2-charge
pnpm scenario:http-wire-capture
```

All scenarios run against a local Anvil fork — no real testnet funds needed.
