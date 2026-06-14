# @x402r/core

Types, ABIs, config, and action functions for the x402r protocol.

## When to use

Most users should install `@x402r/sdk`. Use `@x402r/core` directly for low-level action functions or custom client implementations.

## Install

```bash
pnpm add @x402r/core
```

## Exports

| Path | Contents |
| --- | --- |
| `@x402r/core` | Everything (re-exports all subpaths) |
| `@x402r/core/types` | `PaymentInfo` (type + namespace with `fromWire`/`toWire`), `PaymentInfoWire`, `OperatorConfig`, `PluginConfig`, etc. |
| `@x402r/core/config` | Chain registry, `getChainConfig()`, addresses |
| `@x402r/core/actions` | 50+ action functions (read/write contract calls) |
| `@x402r/core/deploy` | Factory deploy functions, condition builder |
| `@x402r/core/errors` | `X402rError`, `ConfigError`, `ContractCallError`, `ValidationError` |
| `@x402r/core/payment` | `computePaymentInfoHash()`, `PAYMENT_INFO_TYPEHASH`, `validatePaymentInfo()` (payer signing now lives in `@x402/evm`'s auth-capture client) |

## Usage

```ts
import { getPaymentState } from '@x402r/core/actions'

const [isAuthorized, authorizedAmount, chargedAmount] = await getPaymentState(
  publicClient,
  { operatorAddress, chainId: 84532, paymentInfo },
)
```

## `PaymentInfo` — type and converter namespace

`PaymentInfo` is both a type (the bigint-form 12-field payment record) and a const namespace with static `fromWire`/`toWire` converters for crossing the JSON boundary. JSON can't carry bigints, so any time a `PaymentInfo` travels through HTTP, a database column, or a queue payload, it's in the string-form `PaymentInfoWire` shape and has to be hydrated back to bigints before being passed to SDK actions.

```ts
import { PaymentInfo, type PaymentInfoWire } from '@x402r/core'

// JSON shape → bigint shape (for SDK actions)
const info = PaymentInfo.fromWire(req.body.paymentInfoWire)
await client.payment.capture(info, info.maxAmount)

// bigint shape → JSON shape (for persistence / HTTP bodies)
const wire = PaymentInfo.toWire(info)
await db.records.insert({ paymentInfoWire: wire })
```

The `PaymentInfoWire` type is derived from the same contract ABI as `PaymentInfo`, so contract changes update both forms together at compile time. No `@x402r/evm` dependency is required — the wire shape is generated locally from core's own ABI artifacts.

`PaymentInfo.fromWire` throws `ValidationError` on malformed `maxAmount` (non-decimal) or `salt` (non-hex).

## Hook query scoping (opt-in for direct `@x402r/core` consumers)

The 5 hook read functions under `@x402r/core/actions/hook/*` each accept an optional `operatorAddress` filter:

- `getPayerPaymentsFromHook`
- `getReceiverPaymentsFromHook`
- `getPayerPaymentFromHook`
- `getReceiverPaymentFromHook`
- `getHookPaymentInfo`

Without the filter, you see every payment recorded on the canonical chain-singleton `PaymentIndexRecorderHook` — including those owned by operators you don't control. Pass `operatorAddress` to scope reads to a single operator:

```ts
import { getPayerPaymentsFromHook } from '@x402r/core/actions'

const records = await getPayerPaymentsFromHook(publicClient, {
  hookAddress,
  payer: '0x...',
  offset: 0n,
  count: 50n,
  operatorAddress: '0x...', // opt-in: scope to a single operator
})
```

`@x402r/sdk`'s `client.query.*` actions auto-scope by default using the configured `operatorAddress`. If you bypass the SDK and call `@x402r/core` directly, you must opt in per call.

## Docs

[docs.x402r.org](https://docs.x402r.org)

## Provenance

Starting with `0.3.0-alpha.0`, releases of `@x402r/core` are published with [Sigstore-backed provenance attestations](https://docs.npmjs.com/generating-provenance-statements) via [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/). Earlier versions (`0.2.x` and below) do not carry attestations. Verify a provenance-enabled version after install:

```sh
npm audit signatures @x402r/core
```

The attestation bundle is also visible in the npm package metadata under `dist.attestations`. See [`SECURITY.md`](../../SECURITY.md) for the full security policy and how to report vulnerabilities.

## License

[Apache-2.0](../../LICENSE)
