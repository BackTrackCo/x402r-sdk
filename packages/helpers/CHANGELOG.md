# @x402r/helpers

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

- [#122](https://github.com/BackTrackCo/x402r-sdk/pull/122) [`cc02695`](https://github.com/BackTrackCo/x402r-sdk/commit/cc02695d37e5654aed3e76cc7114311332603d40) Thanks [@vraspar](https://github.com/vraspar)! - Lift the SDK to the authCapture contract surface.

  **Breaking — operator methods**
  - `release()` → `capture()` (SDK + on-chain).
  - `refundInEscrow(paymentInfo, amount, data)` → `voidPayment(paymentInfo, data?)`. `void` is full-only and drops the `amount` argument; use partial capture + void remainder for the old partial-refund flow.
  - `refundPostEscrow()` → `refund()`. Allowance helpers renamed: `approvePostEscrowRefund` → `approveRefundAllowance`, `getPostEscrowRefundAllowance` → `getRefundAllowance`.
  - `OperatorConfig.feeRecipient` → `feeReceiver`. `OperatorSlots` fields renamed to `authorizeHook`, `captureCondition`, `feeReceiver`, etc.

  **Breaking — plugin terminology**
  - `recorder` / `Recorder` → `hook` / `Hook` across ABIs, factories, types, exports, and addresses.
  - `actions/recorder/` → `actions/hook/`. `getRecorderPaymentInfo` → `getHookPaymentInfo`. `getPayerPaymentsFromRecorder` → `getPayerPaymentsFromHook`. `getReceiverPaymentsFromRecorder` → `getReceiverPaymentsFromHook`.
  - `recorderCombinator*` → `hookCombinator*`. `paymentIndexRecorder` → `paymentIndexRecorderHook`. `authorizationTimeRecorder` → `authorizationTimeRecorderHook`.
  - `X402rChainConfig.recorders` → `hooks`. `RecorderSingletonAddresses` → `HookSingletonAddresses`. `getRecorderSingletons` → `getHookSingletons`. `iRecorderAbi` → `iHookAbi`.

  **Breaking — types, slots, events, errors**
  - `ConditionConfig` (constructor plugin-config arg) → `PluginConfig`. Shape is now `{authorize, charge, capture, void, refund} × {PreActionCondition, PostActionHook}` per action plus `feeReceiver` and `feeCalculator`. Use named-field syntax.
  - Slot getters renamed: `AUTHORIZE_CONDITION` → `AUTHORIZE_PRE_ACTION_CONDITION`, `AUTHORIZE_RECORDER` → `AUTHORIZE_POST_ACTION_HOOK`. `FEE_RECIPIENT` → `FEE_RECEIVER`.
  - Events renamed to `<Verb>Executed`: `AuthorizationCreated` → `AuthorizeExecuted`, `ReleaseExecuted` → `CaptureExecuted`, `RefundInEscrowExecuted` → `VoidExecuted`, `RefundPostEscrowExecuted` → `RefundExecuted`. `VoidExecuted` no longer carries `amount`. `FeesDistributed.arbiterAmount` → `operatorAmount`.
  - Errors: `ConditionNotMet` → `PreActionConditionNotMet`.

  **Breaking — chains and addresses**
  - `x402rChains` reduced to Base mainnet (8453) and Base Sepolia (84532). Canonical addresses now point at the audited `commerce-payments` v1.0.0 deployment of `AuthCaptureEscrow`.
  - `usdcTvlLimit` removed from the canonical config and helpers re-export. Marketplace and delivery-protection presets now wire `authorizePreActionCondition: zeroAddress`.

  **Breaking — query scoping**
  - SDK `query.*` methods (`getPayerPayments`, `getReceiverPayments`, `getPayment`) auto-scope hook reads to the SDK's configured `operatorAddress`. Direct callers of `@x402r/core/actions/hook/*` must pass `operatorAddress` explicitly to opt in. `getPayerPayment` and `getReceiverPayment` narrow to `Promise<PaymentInfo | null>`.

  **Partial in-escrow refund migration**

  The old `refundInEscrow(paymentInfo, amount)` has no single-call replacement. Use partial capture + void remainder:

  ```ts
  const { capturableAmount } = await client.payment.getAmounts(paymentInfo);
  await client.payment.capture(
    paymentInfo,
    capturableAmount - refundToPayer,
    "0x",
  );
  await client.payment.voidPayment(paymentInfo);
  ```

- [#126](https://github.com/BackTrackCo/x402r-sdk/pull/126) [`598f461`](https://github.com/BackTrackCo/x402r-sdk/commit/598f461072837ef8906951b3a539332831bbe090) Thanks [@vraspar](https://github.com/vraspar)! - Add the `PaymentInfo` namespace and `reconstructPaymentInfoWire` to bridge the authCapture wire format to the bigint shape SDK actions accept.

  **New**
  - `PaymentInfo` is now both a type and a namespace const in `@x402r/core` (re-exported from `@x402r/sdk`). Use `PaymentInfo.fromWire(wire)` to convert a JSON-form `PaymentInfoWire` to the bigint `PaymentInfo`, and `PaymentInfo.toWire(info)` for the reverse.
  - `PaymentInfoWire` type in `@x402r/core` — derived from the contract ABI, stays in sync at compile time when the ABI changes.
  - `reconstructPaymentInfoWire(context)` in `@x402r/helpers` — builds the wire JSON form from a verified `SettleResultContext`.
  - `@x402r/core` no longer declares `@x402r/evm` as a peer dependency. Consumers using only `@x402r/core` (arbiters, standalone wallet code) no longer need `@x402r/evm` installed.

  **Breaking**
  - `@x402r/helpers`: `toPaymentInfo` removed. Use `PaymentInfo.fromWire` from `@x402r/sdk` or `@x402r/core`. Arbiters and standalone workers can now drop the `@x402r/helpers` dependency entirely.
  - `@x402r/helpers`: `reconstructPaymentInfoStruct` renamed to `reconstructPaymentInfoWire`. Return type renamed from `PaymentInfoStruct` to `PaymentInfoWire`.
  - `@x402r/helpers`: `forwardToArbiter` POST body field renamed from `paymentInfoStruct` to `paymentInfoWire`. Arbiters should consume `req.body.paymentInfoWire` and run it through `PaymentInfo.fromWire`.

### Patch Changes

- Updated dependencies [[`fc56fae`](https://github.com/BackTrackCo/x402r-sdk/commit/fc56fae28610123ff0684255d42b46a381fa1a33), [`cc02695`](https://github.com/BackTrackCo/x402r-sdk/commit/cc02695d37e5654aed3e76cc7114311332603d40), [`b7a930f`](https://github.com/BackTrackCo/x402r-sdk/commit/b7a930f1e2ae0f29a7552cdbe43bbecb8bc4c0e3), [`598f461`](https://github.com/BackTrackCo/x402r-sdk/commit/598f461072837ef8906951b3a539332831bbe090)]:
  - @x402r/core@0.3.0-alpha.0
