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
| `@x402r/core/types` | `PaymentInfo`, `OperatorConfig`, `PluginConfig`, etc. |
| `@x402r/core/config` | Chain registry, `getChainConfig()`, addresses |
| `@x402r/core/actions` | 50+ action functions (read/write contract calls) |
| `@x402r/core/deploy` | Factory deploy functions, condition builder |
| `@x402r/core/errors` | `X402rError`, `ConfigError`, `ContractCallError`, `ValidationError` |
| `@x402r/core/payment` | `computePaymentInfoHash()`, `toPaymentInfo()`, `validatePaymentInfo()` |

## Usage

```ts
import { getPaymentState } from '@x402r/core/actions'

const [isAuthorized, authorizedAmount, chargedAmount] = await getPaymentState(
  publicClient,
  { operatorAddress, chainId: 84532, paymentInfo },
)
```

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

## License

[Apache-2.0](../../LICENSE)
