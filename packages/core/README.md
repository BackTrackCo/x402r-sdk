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
| `@x402r/core/types` | `PaymentInfo`, `OperatorConfig`, `ConditionConfig`, etc. |
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
  operatorAddress,
  paymentInfo,
)
```

## Docs

[docs.x402r.org](https://docs.x402r.org)

## License

[Apache-2.0](../../LICENSE)
