---
"@x402r/core": minor
"@x402r/sdk": minor
"@x402r/helpers": minor
---

Lift the SDK to the authCapture contract surface. Clean break — no shims, no back-compat aliases.

**Breaking — operator methods**

- `release()` → `capture()` (SDK + on-chain).
- `refundInEscrow(paymentInfo, amount, data)` → `voidPayment(paymentInfo, data?)`. `void` is full-only and drops the `amount` argument; use partial capture + void remainder for the old partial-refund flow (see below).
- `refundPostEscrow()` → `refund()`. Allowance helpers renamed: `approvePostEscrowRefund` → `approveRefundAllowance`, `getPostEscrowRefundAllowance` → `getRefundAllowance`.
- `OperatorConfig.feeRecipient` → `feeReceiver`. `OperatorSlots` fields renamed to `authorizeHook`, `captureCondition`, `feeReceiver`, etc.

**Breaking — plugin terminology**

- `recorder` / `Recorder` → `hook` / `Hook` across ABIs, factories, types, exports, and addresses.
- `actions/recorder/` → `actions/hook/`. `getRecorderPaymentInfo` → `getHookPaymentInfo`. `getPayerPaymentsFromRecorder` → `getPayerPaymentsFromHook`. `getReceiverPaymentsFromRecorder` → `getReceiverPaymentsFromHook`.
- `recorderCombinator*` → `hookCombinator*`. `paymentIndexRecorder` → `paymentIndexRecorderHook`. `authorizationTimeRecorder` → `authorizationTimeRecorderHook`.
- `X402rChainConfig.recorders` → `hooks`. `RecorderSingletonAddresses` → `HookSingletonAddresses`. `getRecorderSingletons` → `getHookSingletons`. `iRecorderAbi` → `iHookAbi`.

**Breaking — types, slots, events, errors**

- `ConditionConfig` (constructor plugin-config arg) → `PluginConfig`. Shape is now `{authorize, charge, capture, void, refund} × {PreActionCondition, PostActionHook}` per action plus `feeReceiver` and `feeCalculator`. Use named-field syntax.
- Slot getters renamed: `AUTHORIZE_CONDITION` → `AUTHORIZE_PRE_ACTION_CONDITION`, `AUTHORIZE_RECORDER` → `AUTHORIZE_POST_ACTION_HOOK` (same pattern for charge/capture/void/refund). `FEE_RECIPIENT` → `FEE_RECEIVER`.
- Events renamed to `<Verb>Executed`: `AuthorizationCreated` → `AuthorizeExecuted`, `ReleaseExecuted` → `CaptureExecuted`, `RefundInEscrowExecuted` → `VoidExecuted`, `RefundPostEscrowExecuted` → `RefundExecuted`. `VoidExecuted` no longer carries `amount`. `FeesDistributed.arbiterAmount` → `operatorAmount`.
- Errors: `ConditionNotMet` → `PreActionConditionNotMet`. `ReleaseLocked` → `CaptureLocked`.

**Breaking — chains and addresses**

- `x402rChains` reduced to Base mainnet (8453) and Base Sepolia (84532). Canonical addresses now point at the audited `commerce-payments` v1.0.0 deployment of `AuthCaptureEscrow`.
- `usdcTvlLimit` removed from the canonical config and helpers re-export. Marketplace and delivery-protection presets now wire `authorizePreActionCondition: zeroAddress`.

**Breaking — query scoping**

- SDK `query.*` methods (`getPayerPayments`, `getReceiverPayments`, `getPayment`) auto-scope hook reads to the SDK's configured `operatorAddress`. Direct callers of `@x402r/core/actions/hook/*` must pass `operatorAddress` explicitly to opt in. `getPayerPayment` and `getReceiverPayment` narrow to `Promise<PaymentInfo | null>`.

**Partial in-escrow refund migration**

The old `refundInEscrow(paymentInfo, amount)` has no single-call replacement. Use partial capture + void remainder:

```ts
const { capturableAmount } = await client.payment.getAmounts(paymentInfo)
await client.payment.capture(paymentInfo, capturableAmount - refundToPayer, '0x')
await client.payment.voidPayment(paymentInfo)
```
