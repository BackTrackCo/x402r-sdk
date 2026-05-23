# @x402r/sdk

## 0.3.0-alpha.0

### Minor Changes

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

- [#125](https://github.com/BackTrackCo/x402r-sdk/pull/125) [`b7a930f`](https://github.com/BackTrackCo/x402r-sdk/commit/b7a930f1e2ae0f29a7552cdbe43bbecb8bc4c0e3) Thanks [@vraspar](https://github.com/vraspar)! - Add Permit2 payer-side helpers.

  **New**
  - `@x402r/core/payment/permit2`: `signPermit2Authorization`, `createPermit2ApprovalTx`, `getPermit2AllowanceReadParams`, and the `PERMIT2_ADDRESS` constant. Returns `{collectorData, tokenCollector}` suitable for `payment.charge` / `payment.authorize`.
  - `@x402r/sdk` re-exports the four Permit2 surfaces.
  - `@x402r/cli` adds `--asset-transfer-method <eip3009|permit2>` to filter `accepts[]` alongside `--chain`. Invalid value or empty match set errors with a `Malformed402Error` (exit code 2).

### Patch Changes

- Updated dependencies [[`fc56fae`](https://github.com/BackTrackCo/x402r-sdk/commit/fc56fae28610123ff0684255d42b46a381fa1a33), [`cc02695`](https://github.com/BackTrackCo/x402r-sdk/commit/cc02695d37e5654aed3e76cc7114311332603d40), [`b7a930f`](https://github.com/BackTrackCo/x402r-sdk/commit/b7a930f1e2ae0f29a7552cdbe43bbecb8bc4c0e3), [`598f461`](https://github.com/BackTrackCo/x402r-sdk/commit/598f461072837ef8906951b3a539332831bbe090)]:
  - @x402r/core@0.3.0-alpha.0
