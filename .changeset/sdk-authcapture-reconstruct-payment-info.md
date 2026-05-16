---
"@x402r/core": major
"@x402r/helpers": major
---

Add the `PaymentInfo` namespace in `@x402r/core` (re-exported from `@x402r/sdk`) and add `reconstructPaymentInfoWire` in `@x402r/helpers`. Together they bridge the authCapture wire format to the bigint shape SDK actions accept.

**New**

- `PaymentInfo` is now both a type and a namespace const in `@x402r/core` (re-exported from `@x402r/sdk`). Use `PaymentInfo.fromWire(wire)` to convert a JSON-form `PaymentInfoWire` to the bigint `PaymentInfo`, and `PaymentInfo.toWire(info)` for the reverse direction. The TypeScript "type + const sharing a name" pattern lets the same identifier serve both type annotations and value namespace access (same shape as built-in `Date`, `Buffer`, etc.).
- `PaymentInfoWire` type — derived from the contract ABI via the new `AbiPrimitiveToWire<T>` type helper. Stays in sync with `PaymentInfo` at compile time whenever the ABI changes.
- `reconstructPaymentInfoWire(context)` in `@x402r/helpers` — builds the `PaymentInfoWire` JSON form from a verified `SettleResultContext`. Handles the 6 wire→struct field renames and the EIP-3009/Permit2 branch internally.

**Breaking**

- **`@x402r/helpers`: `toPaymentInfo` removed.** Use `PaymentInfo.fromWire` from `@x402r/sdk` or `@x402r/core` instead — same conversion logic, new home. Arbiters and standalone workers can now drop the `@x402r/helpers` dep entirely; they only need `@x402r/sdk`.
- **`@x402r/helpers`: `reconstructPaymentInfoStruct` renamed to `reconstructPaymentInfoWire`.** Same function, return type renamed from `PaymentInfoStruct` to `PaymentInfoWire`. Mechanical search/replace migration.
- **`@x402r/helpers`: `forwardToArbiter`'s POST body field renamed from `paymentInfoStruct` to `paymentInfoWire`.** Arbiters consuming the helper's output should switch from `req.body.paymentInfoStruct` to `req.body.paymentInfoWire` and run it through `PaymentInfo.fromWire` to get bigints. The old `paymentPayload` field (legacy `commerce` scheme) is also gone.

**Why these live where they do**

`PaymentInfo` + converters live in `@x402r/core` because the conversion is scheme-agnostic; the wire type is ABI-derived in core, so there's no `@x402r/evm` dependency. `reconstructPaymentInfoWire` stays in `@x402r/helpers` because it encodes scheme-specific protocol logic (the wire→struct field renames and EIP-3009/Permit2 branching) that doesn't belong in core.
