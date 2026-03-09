[![npm version](https://img.shields.io/npm/v/@x402r/sdk?colorB=1a1a1a)](https://www.npmjs.com/package/@x402r/sdk)
[![License](https://img.shields.io/npm/l/@x402r/sdk?colorB=1a1a1a)](https://github.com/BackTrackCo/x402r-sdk/blob/main/LICENSE)

# @x402r

Refundable payments SDK for EVM chains.

## Quickstart

```bash
npm install @x402r/sdk viem
```

```ts
import { createMerchantClient } from '@x402r/sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const merchant = createMerchantClient({
  publicClient: createPublicClient({ chain: baseSepolia, transport: http() }),
  walletClient: createWalletClient({ account, chain: baseSepolia, transport: http() }),
  operatorAddress: '0x...',
})

// Release a payment after escrow
await merchant.operator.release({ paymentInfo, amount })

// Check payment state
const amounts = await merchant.escrow.getPaymentAmounts({ paymentInfo, chainId: 84532 })
```

## Packages

| Package | Description |
| --- | --- |
| [`@x402r/core`](./packages/core) | Contract interaction primitives, types, config, deploy utilities |
| [`@x402r/sdk`](./packages/sdk) | High-level client with role presets, action groups, `.extend()` plugin system |

## Action Groups

`escrow` · `evidence` · `freeze` · `operator` · `payment` · `refund` · `watch`

Role presets: `createPayerClient` · `createMerchantClient` · `createArbiterClient`

## Networks

Same contract addresses on every chain via CREATE3.

| Chain | Chain ID |
| --- | --- |
| Base Sepolia | 84532 |
| Ethereum Sepolia | 11155111 |
| Ethereum | 1 |
| Base | 8453 |
| Polygon | 137 |
| Arbitrum One | 42161 |
| Optimism | 10 |
| Celo | 42220 |
| Avalanche C-Chain | 43114 |
| Monad | 143 |
| Linea | 59144 |

## Development

```bash
pnpm install        # install dependencies
pnpm build          # build all packages
pnpm test           # run tests
pnpm typecheck      # type-check
pnpm check          # lint (biome)
```

## Links

- [Documentation](https://docs.x402r.org)
- [GitHub](https://github.com/BackTrackCo/x402r-sdk)

## License

[Apache-2.0](./LICENSE)
