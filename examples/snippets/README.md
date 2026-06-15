# Snippets

Small, illustrative code fragments for common x402r SDK calls. Unlike the
[scenarios](../scenarios/README.md), these do **not** run a chain — they show
the shape of the API and are type-checked, not executed.

These live in their own `@x402r/example-snippets` package (depending on
`@x402r/sdk`, `@x402r/core` + viem) so they type-check against the real
published API surface.
Run the type check from the `x402r-sdk` root:

```bash
pnpm snippets:check
```

## Files

| Snippet | Shows |
|---------|-------|
| [`construct-payment-info.ts`](construct-payment-info.ts) | Build a `PaymentInfo` with `getChainConfig` for the token/escrow addresses |
| [`wire-payer-client.ts`](wire-payer-client.ts) | Wire a payer client (`createPayerClient`) from your app's viem clients |
| [`request-refund.ts`](request-refund.ts) | Call `refund.request(paymentInfo, amount)` on a payer client (guards the optional module) |
| [`wire-arbiter-client.ts`](wire-arbiter-client.ts) | Wire an arbiter client (`createArbiterClient`) and the `evidence.getBatch` / `payment.voidPayment` call shapes |

Replace the `0x...` placeholder addresses with real ones before using these
against a chain.
