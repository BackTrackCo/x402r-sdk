---
"@x402r/core": minor
"@x402r/helpers": minor
"@x402r/cli": minor
---

authCapture wire format + autoCapture (PR 2/4 of authCapture migration).

**Breaking**

- `@x402r/helpers` `forwardToArbiter` skips settlements whose scheme is not `'authCapture'` (was `'commerce'`).
- `@x402r/evm` peerDep widened to `>=0.2.0-alpha.0 <0.3.0` on `@x402r/core`, `@x402r/helpers`, `@x402r/cli`.
- `@x402r/core/payment` `toPaymentInfo()` now takes `PaymentInfoStruct` from `@x402r/evm` (was `EscrowPayload`).
- `@x402r/cli` switches `@x402r/evm` import from `registerCommerceEvmScheme` to `registerAuthCaptureEvmScheme`.

**New**

- `x402rDefaults(input) → AuthCaptureExtra` from `@x402r/helpers`. Only `captureAuthorizer` is required.
- Wire-format type re-exports from `@x402r/helpers`: `AuthCaptureExtra`, `AuthCapturePayload`, `Eip3009Payload`, `Permit2Payload`, `PaymentInfoStruct` + payload type guards.
- New scenarios: `examples/scenarios/atomic-charge.ts` (atomic `payment.charge()`) and `partial-refund-flow.ts` (`capture(partial)` then `voidPayment()`).
