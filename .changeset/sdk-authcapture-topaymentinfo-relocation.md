---
"@x402r/core": minor
"@x402r/helpers": minor
---

`toPaymentInfo` relocation (PR 4 of authCapture migration).

**Breaking**

- `@x402r/core`: removed `toPaymentInfo` and `ToPaymentInfoReturnType` exports. Wire-format conversion lives in `@x402r/helpers` now — import from `@x402r/helpers` instead. Also drops `@x402r/core`'s `@x402r/evm` peerDep since core no longer references wire-format types.

**New**

- `@x402r/helpers`: added `toPaymentInfo` and `ToPaymentInfoReturnType` exports. Converts the on-chain `PaymentInfoStruct` (string-encoded uints from the wire) to the runtime `PaymentInfo` (bigint) used by SDK action helpers.
