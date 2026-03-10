# x402r-sdk

TypeScript SDK for x402r refundable payments on EVM chains.

> **Not production-ready.** Packages are not yet published to npm. Expect breaking changes.

## Packages

| Package | Description |
| --- | --- |
| [`@x402r/sdk`](packages/sdk) | Client factory, role presets, action groups |
| [`@x402r/core`](packages/core) | Types, ABIs, config, raw actions, deploy utils |
| [`@x402r/helpers`](packages/helpers) | Payment option builder for x402 HTTP 402 flows |

## Install

```bash
pnpm add @x402r/sdk
```

`@x402r/sdk` re-exports everything from `@x402r/core`.

## Quick example

```ts
import { createPublicClient, createWalletClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { createX402r } from '@x402r/sdk'

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() })
const walletClient = createWalletClient({ chain: baseSepolia, transport: http() })

const x402r = createX402r({
  publicClient,
  walletClient,
  operatorAddress: '0x…',
})

// paymentInfo identifies a payment (payer, receiver, token, amount, operator)
const state = await x402r.payment.getState(paymentInfo)
const config = await x402r.operator.getConfig()
```

## Supported chains

Base Sepolia is supported today. See [`packages/core/src/config/index.ts`](packages/core/src/config/index.ts) for the chain registry.

## Development

```bash
pnpm install        # install dependencies
pnpm build          # build all packages
pnpm test           # run unit tests
pnpm test:fork      # run fork tests (requires Foundry)
pnpm typecheck      # type-check all packages
pnpm check          # biome lint + format check
pnpm format         # auto-fix lint + format
pnpm changeset      # create a changeset
```

## Package details

- **@x402r/sdk** — client factory, role presets, action groups → [README](packages/sdk/README.md)
- **@x402r/core** — types, ABIs, raw actions, deploy utils → [README](packages/core/README.md)
- **@x402r/helpers** — payment option builder → [README](packages/helpers/README.md)

## Docs

[docs.x402r.org](https://docs.x402r.org)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache-2.0](LICENSE)
