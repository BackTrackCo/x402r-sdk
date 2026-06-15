# x402r SDK Examples

Two buckets: type-checked **snippets** that show the shape of common SDK calls,
and runnable multi-role **scenarios** that exercise the full payment lifecycle
against a local Anvil fork.

The per-action SDK operations that used to live here (payer/merchant/arbiter)
are now covered by assertion-driven fork tests in
`packages/core/tests/integration/*.fork.test.ts` — they were integration tests,
not teaching examples, and run under `pnpm test:fork`.

## Quick Start

```bash
cd x402r-sdk
pnpm install && pnpm build
pnpm scenario:http-wire-capture
```

## Snippets

Small, illustrative fragments that compile but don't run a chain. Type-checked,
not executed.

| Snippet | Shows |
|---------|-------|
| [`snippets/construct-payment-info.ts`](snippets/construct-payment-info.ts) | Build a `PaymentInfo` with `getChainConfig` |
| [`snippets/wire-payer-client.ts`](snippets/wire-payer-client.ts) | Construct a payer client with viem clients |
| [`snippets/request-refund.ts`](snippets/request-refund.ts) | Call `refund.request(paymentInfo, amount)` |
| [`snippets/wire-arbiter-client.ts`](snippets/wire-arbiter-client.ts) | Construct an arbiter client + evidence/void call shapes |

```bash
pnpm snippets:check
```

See [`snippets/README.md`](snippets/README.md) for details.

## Scenarios

Multi-role integration scenarios running against a local Anvil fork — no wallet
or testnet funds needed.

| Scenario | Description |
|----------|-------------|
| [`scenarios/http-wire-capture.ts`](scenarios/http-wire-capture.ts) | End-to-end HTTP 402 wire against an in-process facilitator + resource server |

```bash
pnpm scenario:http-wire-capture
```

See [`scenarios/README.md`](scenarios/README.md) for details.
