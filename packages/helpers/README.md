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
  .register(networkId, new AuthCaptureServerScheme())
  .onAfterSettle(forwardToArbiter('http://arbiter:3001'))
```

## Building PaymentRequirements.extra

`x402rDefaults` is a quick-start builder for the wire-format `extra`. Only the facilitator's captureAuthorizer is required:

```ts
import { x402rDefaults } from '@x402r/helpers'

const extra = x402rDefaults({
  captureAuthorizer: '0xCaptureAuthorizer...',
})
// → fully-populated AuthCaptureExtra with sensible defaults
```

See JSDoc on `X402rDefaultsInput` for per-field overrides and production-footgun warnings.

## Converting wire-format payment info

`toPaymentInfo` converts the wire-format `PaymentInfoStruct` (string-encoded uints from `/verify`) to the runtime `PaymentInfo` (bigint) that `client.payment.*` actions accept.

```ts
import { toPaymentInfo } from '@x402r/helpers'

// merchant server, after calling facilitator /verify
const verifyResponse = await facilitator.verify(paymentHeader, requirements)
const paymentInfo = toPaymentInfo(verifyResponse.paymentInfo)

// now usable with SDK actions
await merchantClient.payment.capture(paymentInfo, amount)
```

Throws `ValidationError` on malformed `maxAmount` (non-decimal) or `salt` (non-hex).

## API

### `forwardToArbiter(arbiterUrl, options?)`

Creates an `onAfterSettle` hook that forwards the response body to an arbiter service for evaluation. Fire-and-forget — does not block the response to the client.

- Only fires for successful authCapture scheme settlements
- POSTs `{ responseBody, transaction, paymentPayload }` to `{arbiterUrl}/verify`
- Errors silently caught (arbiter being down shouldn't break payment flow)

#### Options

| Option    | Type                         | Description                                      |
| --------- | ---------------------------- | ------------------------------------------------ |
| `onError` | `(error: unknown) => void`   | Custom error handler. Defaults to `console.warn`. |

```ts
forwardToArbiter('http://arbiter:3001', {
  onError: (err) => sentry.captureException(err),
})
```

## Docs

[docs.x402r.org](https://docs.x402r.org)

## License

[Apache-2.0](../../LICENSE)
