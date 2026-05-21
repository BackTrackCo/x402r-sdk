# @x402r/core

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

- [#122](https://github.com/BackTrackCo/x402r-sdk/pull/122) [`cc02695`](https://github.com/BackTrackCo/x402r-sdk/commit/cc02695d37e5654aed3e76cc7114311332603d40) Thanks [@vraspar](https://github.com/vraspar)! - Lift SDK to the authCapture contract surface (BackTrackCo/x402r-contracts#34, merged at `9786579`).

  Breaking changes — clean break, no shims:

  **Operator method renames**
  - `release()` → `capture()`. SDK function and on-chain method both renamed; no back-compat alias.
  - `refundInEscrow(paymentInfo, amount, data)` → `voidPayment(paymentInfo, data?)`. The `amount` argument is dropped — the new `escrow.void()` is full-only and empties the entire authorization regardless of any partial value the caller intends. See migration note below.
  - `refundPostEscrow()` → `refund()` on both SDK and contract. Renamed helpers: `approvePostEscrowRefund` → `approveRefundAllowance`, `getPostEscrowRefundAllowance` → `getRefundAllowance`.
  - `feeRecipient` → `feeReceiver` on `OperatorConfig` (auto-derived from new ABI). `OperatorSlots` return shape from `getOperatorConfig()` also renamed to short-form fields (`authorizeHook`, `captureCondition`, `feeReceiver`, etc.).

  **Plugin terminology**
  - `recorder`/`Recorder` → `hook`/`Hook` everywhere (ABIs, factories, types, files, exports, addresses).
  - `actions/recorder/` directory renamed to `actions/hook/`. Action functions: `getRecorderPaymentInfo` → `getHookPaymentInfo`, `getPayerPaymentsFromRecorder` → `getPayerPaymentsFromHook`, `getReceiverPaymentsFromRecorder` → `getReceiverPaymentsFromHook`.
  - `recorderCombinator`/`recorderCombinatorFactory` → `hookCombinator`/`hookCombinatorFactory` in factory function names, types, and `factories.*` config field.
  - `paymentIndexRecorder` → `paymentIndexRecorderHook`; `authorizationTimeRecorder` → `authorizationTimeRecorderHook`. (Tracks the `BackTrackCo/x402r-contracts#36` rename — the post-action slot needs to distinguish recorder-style hooks from arbitrary ones, so `RecorderHook` is back as a suffix.)
  - `recorders` config field on `X402rChainConfig` → `hooks`; `RecorderSingletonAddresses` → `HookSingletonAddresses`; `getRecorderSingletons` → `getHookSingletons`.
  - `recorderCombinatorCodehash` → `hookCombinatorCodehash`.
  - `iRecorderAbi` → `iHookAbi` (and the rest of the recorder→hook ABI consts).

  **Type renames**
  - `ConditionConfig` (constructor's plugin-config arg) → `PluginConfig`. Field shape changed too: now `{authorize,charge,capture,void,refund} × {PreActionCondition, PostActionHook}` per action, `feeReceiver`, `feeCalculator`. Use named-field syntax — positional struct literals will misalign.

  **Slot getters**
  - `AUTHORIZE_CONDITION` → `AUTHORIZE_PRE_ACTION_CONDITION`, `AUTHORIZE_RECORDER` → `AUTHORIZE_POST_ACTION_HOOK`, same pattern for charge/capture/void/refund slots. `FEE_RECIPIENT` → `FEE_RECEIVER`. `ConditionSlot` union updated.

  **Events**
  - All five action events renamed to `<Verb>Executed`: `AuthorizationCreated` → `AuthorizeExecuted`, `ReleaseExecuted` → `CaptureExecuted`, `RefundInEscrowExecuted` → `VoidExecuted`, `RefundPostEscrowExecuted` → `RefundExecuted`.
  - `VoidExecuted` no longer carries an `amount` field.
  - `FeesDistributed.arbiterAmount` → `operatorAmount`.

  **Errors**
  - `ConditionNotMet` → `PreActionConditionNotMet`. (`ReleaseLocked` → `CaptureLocked` flows through the new ABI.)

  **Drops**
  - `usdcTvlLimit` removed from canonical config + ABI exports + helpers re-export. Source remains in `x402r-contracts` for ad-hoc per-chain integrations; SDK no longer ships the canonical address. Marketplace/delivery-protection presets now wire `authorizePreActionCondition: zeroAddress` (was the TVL gate).
  - `SKALE Base` chain (chainId `1187947933`) dropped from `x402rChains`. SKALE runs Shanghai EVM but the canonical commerce-payments bytecode targets Cancun (TSTORE/TLOAD via Solady's `ReentrancyGuardTransient`). CREATE2 binds bytecode, so Shanghai-recompiled bytecode lands at a different address than the canonical one — single-canonical-address is incompatible without shipping a chain-specific island.
  - All chains except Base mainnet (8453) and Base Sepolia (84532) dropped from `x402rChains`. The SDK now points at the canonical `commerce-payments at v1.0.0` AuthCaptureEscrow, which lives on those two chains today; other EVMs return as the canonical primitives extend coverage.

  **Canonical addresses**
  - `authCaptureEscrow`, `tokenCollector`, and the `commercePayments*` exports point at the canonical `commerce-payments at v1.0.0` deployment (`0xBdEA0D…420cff` / `0x0E3dF951…7A7757` / `0x992476B9…0aB26`).
  - `protocolFeeConfig`, `conditions.*`, and the escrow-free entries of `factories.*` (`staticFeeCalculator`, `staticAddressCondition`, `andCondition`, `orCondition`, `notCondition`, `hookCombinator`, `signatureCondition`, `refundRequestEvidence`) live at salt namespace `x402r-canonical-v1::*` — unchanged from prior canonical deployments.
  - `receiverRefundCollector` and the escrow-bound entries of `factories.*` (`paymentOperator`, `escrowPeriod`, `freeze`, `refundRequest`) plus `hooks.paymentIndexRecorderHook` are at the new `x402r-canonical-v1.0.1::*` salt namespace, rebound to the canonical escrow. `hooks.paymentIndexRecorderHook` lands at `0x358ECA14fFD51e63D2Bb8DDE3aBAA14f8D5274C3`. See `x402r-contracts/deployments/canonical-v1.0.1.json` for the full set + tx hashes.
  - Owner / fee recipient on `ProtocolFeeConfig` is `0x773dBcB5BDb3Df8359ba4e42D7Ce7AE3fC9Ee235`; protocol-fee calculator is unset (`address(0)`), so `getProtocolFeeBps()` returns `0`.

  **Workspace dev**
  - `@x402r/sdk` and `@x402r/helpers` deps on `@x402r/core` switched to the `workspace:^` protocol (was `^0.2.0`) so local edits resolve through the workspace. `pnpm publish` substitutes the resolved version at publish time; consumer-facing `package.json` is unchanged.

  ***

  ## Migration: partial in-escrow refund (R-25)

  The new `escrow.void()` is full-only — calling it empties the entire authorization in one transaction. Partial refunds while funds are still in escrow no longer have a single-call equivalent. The replacement is **partial capture** — capture only the amount the merchant intends to keep, then void the remainder back to the payer:

  ```ts
  // Old (single call, no longer supported):
  //   await client.payment.refundInEscrow(paymentInfo, partialAmount)

  // New (two calls, no allowance / collector setup):
  const { capturableAmount } = await client.payment.getAmounts(paymentInfo);
  const merchantAmount = capturableAmount - refundToPayer;

  // 1. Capture only what the merchant keeps
  //    (decrements escrow.capturableAmount by merchantAmount)
  await client.payment.capture(paymentInfo, merchantAmount, "0x");

  // 2. Void what's left — returns the remaining escrowed amount to the payer
  //    (atomically settles any pending RefundRequest via the voidPostActionHook)
  await client.payment.voidPayment(paymentInfo);
  ```

  This matches the canonical authCapture semantics: `capture` is incremental (can be called multiple times up to the cumulative authorized amount), and `void` zeros out the remaining `capturableAmount`. No `ReceiverRefundCollector` allowance, no merchant capital movement, no separate refund flow.

  For **post-capture refunds** (after the merchant has already captured and wants to refund a customer), use the post-escrow flow:

  ```ts
  // One-time setup: pre-stake an ERC-20 allowance on ReceiverRefundCollector
  await client.payment.approveRefundAllowance(token, allowanceAmount);

  // Refund any amount up to the standing allowance
  await client.payment.refund(
    paymentInfo,
    refundAmount,
    receiverRefundCollector,
    encodedData,
  );
  ```

  **Recovery if `voidPayment` doesn't land.** The partial-capture flow is two transactions. If the second tx (`voidPayment`) never executes — crash, gas exhaustion, key loss — the payer's remainder sits in escrow under the original authorization. Recovery is on-chain via `AuthCaptureEscrow.reclaim(paymentInfo)`, callable by the payer after `paymentInfo.refundExpiry`. The SDK does not currently ship a `payment.reclaim()` wrapper; call the contract directly via `walletClient.writeContract({ address: authCaptureEscrow, abi: authCaptureEscrowAbi, functionName: 'reclaim', args: [paymentInfo] })`. A typed wrapper is on the PR 2/4 backlog.

  ***

  ## Cross-operator data scoping

  `PaymentIndexRecorderHook` is a chain singleton — one address per chain shared by every operator that routes through `HookCombinator`. The SDK's `query.*` methods (`getPayerPayments`, `getReceiverPayments`, `getPayment`) automatically scope hook reads to the SDK's configured `operatorAddress`, matching how `createEventProvider` already works. Multi-operator deployments no longer get mingled records by default.

  Direct callers of `@x402r/core/actions/hook/*` (`getPayerPaymentsFromHook`, `getReceiverPaymentsFromHook`, `getHookPaymentInfo`, `getPayerPayment`, `getReceiverPayment`) must pass `operatorAddress` explicitly to opt into filtering — by default these return unfiltered (mingled) data matching the contract behavior.

  Caveat: the on-chain `total` count returned by `getPayerPaymentsFromHook` and `getReceiverPaymentsFromHook` reflects the unfiltered count even when the returned `payments` array is filtered. Callers needing per-operator-accurate totals must paginate fully and count filtered results client-side. Per-operator-accurate totals would require contract changes (out of scope).

  Breaking change: `getPayerPayment` and `getReceiverPayment` (single-record-by-index reads) return type narrowed from `Promise<PaymentInfo>` to `Promise<PaymentInfo | null>` to surface mismatches when `operatorAddress` is set.

  `createHookProvider` signature changed: third arg is now `options?: { pageSize?, operatorAddress? }` instead of positional `pageSize?`. Internal-only — not exported from `@x402r/sdk`.

  ***

  ## Out of scope (PR 2/3/4 per `x402r-notes/plans/AUTHCAPTURE_SDK_MIGRATION.md`)
  - `@x402r/helpers` scheme filter `'commerce' → 'authCapture'` (PR 2)
  - `autoCapture` plumbing (PR 2)
  - Permit2 support (PR 3)
  - `x402rDefaults()` helper + new wire-format type re-exports (PR 4)
  - Bumping `@x402r/evm` peerDep version (PR 2)

- [#125](https://github.com/BackTrackCo/x402r-sdk/pull/125) [`b7a930f`](https://github.com/BackTrackCo/x402r-sdk/commit/b7a930f1e2ae0f29a7552cdbe43bbecb8bc4c0e3) Thanks [@vraspar](https://github.com/vraspar)! - Permit2 support (PR 3 of authCapture migration).

  **New**
  - `@x402r/core/payment/permit2`: `signPermit2Authorization`, `createPermit2ApprovalTx`, `getPermit2AllowanceReadParams`, `PERMIT2_ADDRESS`. Parallels `signReceiveAuthorization` — returns `{collectorData, tokenCollector}` suitable for direct `payment.charge` / `payment.authorize`. `collectorData` is the raw 65-byte EOA signature (commerce-payments' Permit2PaymentCollector forwards it straight to `permit2.permitTransferFrom`).
  - `@x402r/sdk`: re-exports the four `@x402r/core` Permit2 surfaces above.
  - `@x402r/cli`: `--asset-transfer-method <eip3009|permit2>` flag — filters `accepts[]` in addition to `--chain`. Errors on unknown value or empty match set with a `Malformed402Error` (exit code 2).
  - New scenario: `examples/scenarios/permit2-charge.ts`. Demonstrates the one-time `ERC20.approve(PERMIT2, MAX)` step and an atomic Permit2 charge with balance-delta assertions.

- [#126](https://github.com/BackTrackCo/x402r-sdk/pull/126) [`598f461`](https://github.com/BackTrackCo/x402r-sdk/commit/598f461072837ef8906951b3a539332831bbe090) Thanks [@vraspar](https://github.com/vraspar)! - Add the `PaymentInfo` namespace in `@x402r/core` (re-exported from `@x402r/sdk`) and add `reconstructPaymentInfoWire` in `@x402r/helpers`. Together they bridge the authCapture wire format to the bigint shape SDK actions accept.

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

- [#124](https://github.com/BackTrackCo/x402r-sdk/pull/124) [`103d428`](https://github.com/BackTrackCo/x402r-sdk/commit/103d42877ed10e0656c02a502020746d03976f95) Thanks [@vraspar](https://github.com/vraspar)! - `toPaymentInfo` relocation (PR 4 of authCapture migration).

  **Breaking**
  - `@x402r/core`: removed `toPaymentInfo` and `ToPaymentInfoReturnType` exports. Wire-format conversion lives in `@x402r/helpers` now — import from `@x402r/helpers` instead. Also drops `@x402r/core`'s `@x402r/evm` peerDep since core no longer references wire-format types.

  **New**
  - `@x402r/helpers`: added `toPaymentInfo` and `ToPaymentInfoReturnType` exports. Converts the on-chain `PaymentInfoStruct` (string-encoded uints from the wire) to the runtime `PaymentInfo` (bigint) used by SDK action helpers.
