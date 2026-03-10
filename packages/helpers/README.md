# @x402r/helpers

Payment option builder for x402r. Adds escrow fields to x402 payment options.

## Install

```bash
pnpm add @x402r/helpers
```

## Usage

```ts
import { refundable } from '@x402r/helpers'

const option = refundable(
  { scheme: 'escrow', network: 'eip155:84532', price: '$0.01' },
  '0xMyOperator…',
)
```

## API

### `refundable(option, operatorAddress, options?)`

Augments a payment option with the escrow `extra` fields required by x402r. Addresses and fee defaults come from the chain config for the option's `network`.

**`RefundableOptions`** (all optional):

- `escrowAddress` — override the escrow contract address
- `tokenCollector` — override the token collector address
- `minFeeBps` — minimum fee in basis points (default: `0`)
- `maxFeeBps` — maximum fee in basis points (default: `1000`)
- `settlementMethod` — `'authorize'` (default) or `'charge'`
- `postCaptureRefundDeadline` — seconds after capture during which refunds are accepted

## Docs

[docs.x402r.org](https://docs.x402r.org)

## License

[Apache-2.0](../../LICENSE)
