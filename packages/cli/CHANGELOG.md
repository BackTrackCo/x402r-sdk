# @x402r/cli

## 0.3.0-alpha.0

### Minor Changes

- [#123](https://github.com/BackTrackCo/x402r-sdk/pull/123) [`fc56fae`](https://github.com/BackTrackCo/x402r-sdk/commit/fc56fae28610123ff0684255d42b46a381fa1a33) Thanks [@vraspar](https://github.com/vraspar)! - authCapture wire format glue and autoCapture builder.

  **Breaking**
  - `@x402r/helpers` `forwardToArbiter` skips settlements whose scheme is not `'authCapture'` (was `'commerce'`).
  - `@x402r/helpers` and `@x402r/cli` widen `@x402r/evm` to `>=0.2.0-alpha.0 <0.3.0`.
  - `@x402r/cli` switches from `registerCommerceEvmScheme` to `registerAuthCaptureEvmScheme`.

  **New**
  - `x402rDefaults(input) → AuthCaptureExtra` from `@x402r/helpers` — only `captureAuthorizer` is required.
  - Wire-format types re-exported from `@x402r/helpers`: `AuthCaptureExtra`, `AuthCapturePayload`, `Eip3009Payload`, `Permit2Payload`, `PaymentInfoStruct`, plus payload type guards.

### Patch Changes

- [#125](https://github.com/BackTrackCo/x402r-sdk/pull/125) [`b7a930f`](https://github.com/BackTrackCo/x402r-sdk/commit/b7a930f1e2ae0f29a7552cdbe43bbecb8bc4c0e3) Thanks [@vraspar](https://github.com/vraspar)! - Add Permit2 payer-side helpers.

  **New**
  - `@x402r/core/payment/permit2`: `signPermit2Authorization`, `createPermit2ApprovalTx`, `getPermit2AllowanceReadParams`, and the `PERMIT2_ADDRESS` constant. Returns `{collectorData, tokenCollector}` suitable for `payment.charge` / `payment.authorize`.
  - `@x402r/sdk` re-exports the four Permit2 surfaces.
  - `@x402r/cli` adds `--asset-transfer-method <eip3009|permit2>` to filter `accepts[]` alongside `--chain`. Invalid value or empty match set errors with a `Malformed402Error` (exit code 2).
