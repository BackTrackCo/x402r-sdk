---
"@x402r/core": minor
"@x402r/helpers": minor
---

Relocate `toPaymentInfo` from `@x402r/core` to `@x402r/helpers`. `@x402r/core` is now zero-dependency on `@x402*` packages (only `viem`).

**Breaking**

- `@x402r/core` no longer exports `toPaymentInfo` or `ToPaymentInfoReturnType`. Import from `@x402r/helpers` instead.
- `@x402r/core` no longer declares `@x402r/evm` as a peer dependency.

**New**

- `@x402r/helpers` exports `toPaymentInfo` and `ToPaymentInfoReturnType`. Converts the on-chain `PaymentInfoStruct` (string-encoded uints) to the runtime `PaymentInfo` (bigint).
