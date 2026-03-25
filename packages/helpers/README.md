# @x402r/helpers

Lifecycle hooks for x402r escrow payments.

## Install

```bash
pnpm add @x402r/helpers
```

## Usage

```ts
import { forwardToArbiter } from '@x402r/helpers'

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(networkId, new EscrowServerScheme())
  .onAfterSettle(forwardToArbiter('http://arbiter:3001'))
```

## API

### `forwardToArbiter(arbiterUrl)`

Creates an `onAfterSettle` hook that forwards the response body to an arbiter service for evaluation. Fire-and-forget — does not block the response to the client.

- Only fires for successful escrow scheme settlements
- POSTs `{ responseBody, network, transaction, scheme }` to `{arbiterUrl}/verify`
- Errors silently caught (arbiter being down shouldn't break payment flow)

## Docs

[docs.x402r.org](https://docs.x402r.org)

## License

[Apache-2.0](../../LICENSE)
