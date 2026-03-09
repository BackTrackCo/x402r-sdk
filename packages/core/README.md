# @x402r/core

Contract interaction primitives for the x402r refundable payments protocol.

## Install

```bash
npm install @x402r/core viem
```

## Usage

```ts
import { authorize, getPaymentState } from '@x402r/core/actions'
import { getChainConfig } from '@x402r/core/config'

const config = getChainConfig(84532) // Base Sepolia
```

## Links

- [Documentation](https://docs.x402r.org/sdk/overview)
- [GitHub](https://github.com/BackTrackCo/x402r-sdk)
- [License](../../LICENSE)
