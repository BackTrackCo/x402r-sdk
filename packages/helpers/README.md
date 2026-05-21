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

## Reconstructing PaymentInfo after settlement

The authCapture wire format omits the on-chain `PaymentInfo` struct (it's derivable from `requirements + payload.salt + payer`). Merchants needing to call escrow actions later (`payment.capture`, `payment.voidPayment`, `payment.refund`) use two pieces to bridge the wire format to the runtime form SDK actions accept:

- **`reconstructPaymentInfoWire(context)`** — from `@x402r/helpers`. Builds the JSON-form `PaymentInfoWire` from a verified `SettleResultContext`. Handles the wire→struct field renames and the EIP-3009 vs Permit2 branch internally.
- **`PaymentInfo.fromWire(wire)`** — from `@x402r/sdk` (or `@x402r/core`). Converts the JSON-form `PaymentInfoWire` to the bigint-form `PaymentInfo` SDK actions accept.

The two are bookends, not a pipeline: typically `reconstructPaymentInfoWire` runs once at settle time to produce a JSON-safe record you can persist, and `PaymentInfo.fromWire` runs later (in a worker, a refund endpoint, a dispute resolver) to hydrate that record back to bigints right before calling SDK actions.

```ts
// at settle time — persist the JSON-safe wire form
import { reconstructPaymentInfoWire } from '@x402r/helpers'

resourceServer.onAfterSettle(async (context) => {
  const paymentInfoWire = reconstructPaymentInfoWire(context)
  await db.jobs.create({
    jobId: context.result.transaction,
    paymentInfoWire,
    task: '...',
  })
})
```

```ts
// later, in a worker — hydrate to bigints and call SDK
import { PaymentInfo } from '@x402r/sdk'

async function processJob(job) {
  const result = await doWork(job.task)
  const paymentInfo = PaymentInfo.fromWire(job.paymentInfoWire)

  if (result.success) {
    // capture the full pre-authorized amount; pass a smaller bigint for partial capture
    await merchantClient.payment.capture(paymentInfo, paymentInfo.maxAmount)
  } else {
    await merchantClient.payment.voidPayment(paymentInfo)
  }
}
```

For in-process synchronous use, chain them in one expression: `PaymentInfo.fromWire(reconstructPaymentInfoWire(context))`.

`reconstructPaymentInfoWire` throws `ValidationError` if the context isn't a verified authCapture settlement (`requirements.extra` not an `AuthCaptureExtra`, payload not an `AuthCapturePayload`, or `result.payer` missing). `PaymentInfo.fromWire` throws `ValidationError` on malformed `maxAmount` (non-decimal) or `salt` (non-hex).

## API

### `forwardToArbiter(arbiterUrl, options?)`

Creates an `onAfterSettle` hook that forwards the response body to an arbiter service for evaluation. Fire-and-forget — does not block the response to the client.

- Only fires for successful authCapture scheme settlements
- Calls `reconstructPaymentInfoWire` internally; POSTs `{ responseBody, transaction, paymentInfoWire }` to `{arbiterUrl}/verify`
- `paymentInfoWire` is the JSON-form `PaymentInfoWire` — arbiters run it through `PaymentInfo.fromWire` (from `@x402r/sdk`) to get bigints for SDK actions
- Errors silently caught (arbiter being down shouldn't break payment flow); if reconstruction itself fails, the POST is skipped and `onError` is invoked

#### Arbiter side

The arbiter only needs `@x402r/sdk` — no `@x402r/helpers` dependency required:

```ts
import { PaymentInfo } from '@x402r/sdk'

app.post('/verify', async (req) => {
  const verdict = await evaluateContent(req.body.responseBody)
  const paymentInfo = PaymentInfo.fromWire(req.body.paymentInfoWire)

  if (verdict === 'PASS') {
    await arbiterSdk.payment.capture(paymentInfo, paymentInfo.maxAmount)
  } else {
    await arbiterSdk.payment.voidPayment(paymentInfo)
  }
})
```

#### Migration note

Prior versions shipped `paymentPayload` (the raw wire payload) instead of `paymentInfoWire`. That worked under the legacy `commerce` scheme where the payload carried the struct directly, but the authCapture wire format omits it. Update your arbiter to read `req.body.paymentInfoWire` and run it through `PaymentInfo.fromWire` to get bigints; remove any legacy `paymentPayload.payload.paymentInfo` access path. The deleted `toPaymentInfo` helper is replaced by `PaymentInfo.fromWire` — same conversion logic, new home.

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

## Provenance

Starting with `0.3.0-alpha.0`, releases of `@x402r/helpers` are published with [Sigstore-backed provenance attestations](https://docs.npmjs.com/generating-provenance-statements) via [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/). Earlier versions (`0.2.x` and below) do not carry attestations. Verify a provenance-enabled version after install:

```sh
npm audit signatures @x402r/helpers
```

The attestation bundle is also visible in the npm package metadata under `dist.attestations`. See [`SECURITY.md`](../../SECURITY.md) for the full security policy and how to report vulnerabilities.

## License

[Apache-2.0](../../LICENSE)
