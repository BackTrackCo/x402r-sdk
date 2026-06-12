# Scenarios

Multi-role integration scenarios that exercise the x402r payment lifecycle against a local Anvil fork.

The assertion-driven scenarios (`happy-path-capture`, `atomic-charge`, `partial-refund-flow`, `dispute-resolution`, `permit2-charge`) have moved into the core vitest fork-test suite at `packages/core/tests/integration/*.fork.test.ts` — they were integration tests, not teaching examples, and now run under `pnpm test:fork`. `http-wire-capture` stays here because it exercises the upstream `@x402/express` ↔ `@x402r/evm` HTTP-wire integration, not the SDK payer-signing surface.

## Prerequisites

- Node >= 22
- pnpm 10.23+
- `x402r-sdk` packages built (`pnpm build` from root)

## Available Scenarios

### http-wire-capture

Cross-package integration test exercising the real HTTP 402 wire end-to-end against an in-process facilitator and resource server.

Boots `@x402/express`'s `paymentMiddleware` + `x402ResourceServer` (with `AuthCaptureEvmScheme` from `@x402r/evm/auth-capture/server`) on one port, `@x402/core`'s `x402Facilitator` (with `AuthCaptureEvmScheme` from `@x402r/evm/auth-capture/facilitator`) on another, and a payer client using `@x402/fetch`'s `wrapFetchWithPayment` + `AuthCaptureEvmScheme` from `@x402/evm/auth-capture/client`. The payer's `fetch` returns HTTP 402, the wrapper signs an authorization, retries, and the facilitator settles on-chain. Asserts the settle tx targets the canonical AuthCaptureEscrow, payer ↓ amount, receiver unchanged (autoCapture left unset), the `PaymentAuthorized` event's `paymentInfo` fields match the resource server's published requirements, and `paymentState(paymentInfoHash)` on the escrow has `hasCollectedPayment === true` and `capturableAmount === amount`.

This is the only scenario that exercises the `@x402/express` ↔ `@x402r/evm` integration seam — wire-format mismatches, scheme registration drift, or signer-interface changes between the upstream packages and `@x402r/evm` surface here and nowhere else in the suite.

## Running

```bash
# From x402r-sdk root
pnpm scenario:http-wire-capture
```

Runs against a local Anvil fork — no real testnet funds needed.
