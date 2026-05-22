---
"@x402r/core": minor
"@x402r/helpers": minor
---

Add the `PaymentInfo` namespace and `reconstructPaymentInfoWire` to bridge the authCapture wire format to the bigint shape SDK actions accept.

**New**

- `PaymentInfo` is now both a type and a namespace const in `@x402r/core` (re-exported from `@x402r/sdk`). Use `PaymentInfo.fromWire(wire)` to convert a JSON-form `PaymentInfoWire` to the bigint `PaymentInfo`, and `PaymentInfo.toWire(info)` for the reverse.
- `PaymentInfoWire` type in `@x402r/core` — derived from the contract ABI, stays in sync at compile time when the ABI changes.
- `reconstructPaymentInfoWire(context)` in `@x402r/helpers` — builds the wire JSON form from a verified `SettleResultContext`. Handles the wire-to-struct field renames and the EIP-3009 / Permit2 branch internally.

**Breaking**

- `@x402r/helpers`: `toPaymentInfo` removed. Use `PaymentInfo.fromWire` from `@x402r/sdk` or `@x402r/core`. Arbiters and standalone workers can now drop the `@x402r/helpers` dependency entirely.
- `@x402r/helpers`: `reconstructPaymentInfoStruct` renamed to `reconstructPaymentInfoWire`. Return type renamed from `PaymentInfoStruct` to `PaymentInfoWire`.
- `@x402r/helpers`: `forwardToArbiter` POST body field renamed from `paymentInfoStruct` to `paymentInfoWire`. Arbiters should consume `req.body.paymentInfoWire` and run it through `PaymentInfo.fromWire`.
