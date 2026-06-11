---
"@x402r/core": minor
"@x402r/helpers": minor
"@x402r/cli": minor
---

authCapture wire format glue and autoCapture builder.

**Breaking**

- `@x402r/helpers` `forwardToArbiter` skips settlements whose scheme is not `'authCapture'` (was `'commerce'`).
- `@x402r/helpers` and `@x402r/cli` widen `@x402r/evm` to `>=0.2.0-alpha.0 <0.3.0`.
- `@x402r/cli` switches from `registerCommerceEvmScheme` to `registerAuthCaptureEvmScheme`.

**New**

- `x402rDefaults(input) → X402rDefaultsExtra` from `@x402r/helpers` — only `captureAuthorizer` is required.
- Wire-format types re-exported from `@x402r/helpers`: `AuthCaptureExtra`, `AuthCapturePayload`, `Eip3009Payload`, `Permit2Payload`, `PaymentInfoStruct`, plus payload type guards.
