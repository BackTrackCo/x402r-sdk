# @x402r/cli

## 0.3.0-alpha.0

### Minor Changes

- [#123](https://github.com/BackTrackCo/x402r-sdk/pull/123) [`fc56fae`](https://github.com/BackTrackCo/x402r-sdk/commit/fc56fae28610123ff0684255d42b46a381fa1a33) Thanks [@vraspar](https://github.com/vraspar)! - authCapture wire format + autoCapture (PR 2/4 of authCapture migration).

  **Breaking**
  - `@x402r/helpers` `forwardToArbiter` skips settlements whose scheme is not `'authCapture'` (was `'commerce'`).
  - `@x402r/evm` peerDep widened to `>=0.2.0-alpha.0 <0.3.0` on `@x402r/core`, `@x402r/helpers`, `@x402r/cli`.
  - `@x402r/core/payment` `toPaymentInfo()` now takes `PaymentInfoStruct` from `@x402r/evm` (was `EscrowPayload`).
  - `@x402r/cli` switches `@x402r/evm` import from `registerCommerceEvmScheme` to `registerAuthCaptureEvmScheme`.

  **New**
  - `x402rDefaults(input) → AuthCaptureExtra` from `@x402r/helpers`. Only `captureAuthorizer` is required.
  - Wire-format type re-exports from `@x402r/helpers`: `AuthCaptureExtra`, `AuthCapturePayload`, `Eip3009Payload`, `Permit2Payload`, `PaymentInfoStruct` + payload type guards.
  - New scenarios: `examples/scenarios/atomic-charge.ts` (atomic `payment.charge()`) and `partial-refund-flow.ts` (`capture(partial)` then `voidPayment()`).

### Patch Changes

- [#125](https://github.com/BackTrackCo/x402r-sdk/pull/125) [`b7a930f`](https://github.com/BackTrackCo/x402r-sdk/commit/b7a930f1e2ae0f29a7552cdbe43bbecb8bc4c0e3) Thanks [@vraspar](https://github.com/vraspar)! - Permit2 support (PR 3 of authCapture migration).

  **New**
  - `@x402r/core/payment/permit2`: `signPermit2Authorization`, `createPermit2ApprovalTx`, `getPermit2AllowanceReadParams`, `PERMIT2_ADDRESS`. Parallels `signReceiveAuthorization` — returns `{collectorData, tokenCollector}` suitable for direct `payment.charge` / `payment.authorize`. `collectorData` is the raw 65-byte EOA signature (commerce-payments' Permit2PaymentCollector forwards it straight to `permit2.permitTransferFrom`).
  - `@x402r/sdk`: re-exports the four `@x402r/core` Permit2 surfaces above.
  - `@x402r/cli`: `--asset-transfer-method <eip3009|permit2>` flag — filters `accepts[]` in addition to `--chain`. Errors on unknown value or empty match set with a `Malformed402Error` (exit code 2).
  - New scenario: `examples/scenarios/permit2-charge.ts`. Demonstrates the one-time `ERC20.approve(PERMIT2, MAX)` step and an atomic Permit2 charge with balance-delta assertions.
