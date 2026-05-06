---
"@x402r/core": major
"@x402r/sdk": major
"@x402r/helpers": major
---

Lift SDK to the authCapture contract surface (BackTrackCo/x402r-contracts#34, merged at `9786579`).

Breaking changes — clean break, no shims:

**Operator method renames**
- `release()` → on-chain method now `capture` (SDK-side `release` action still exported, internally calls `capture`; cosmetic rename of the SDK function landing in a follow-up commit).
- `refundInEscrow(paymentInfo, amount, data)` — the `amount` argument is now ignored. The new `escrow.void()` is full-only and empties the entire authorization regardless of any partial value the caller passes. See migration note below.
- `refundPostEscrow()` — on-chain method now `refund`; SDK-side function unchanged for now.
- `feeRecipient` → `feeReceiver` on `OperatorConfig` (auto-derived from new ABI). The `OperatorSlots` return shape from `getOperatorConfig()` keeps `feeRecipient` for now (cosmetic rename pending).

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

**Canonical CREATE2 addresses**
- `authCaptureEscrow`, `tokenCollector`, `protocolFeeConfig`, `receiverRefundCollector`, `factories.*`, `conditions.*`, and `hookCombinatorCodehash` now point at the canonical CREATE2 deployment (salt namespaces `commerce-payments::v1::*` and `x402r-canonical-v1::*`). New `commercePayments*` exports surface the three primitive addresses individually (escrow + ERC3009 collector + Permit2 collector).
- `hooks.paymentIndexRecorderHook` is the canonical chain singleton at `0x16CF99e10f05E4CB9E3E6d805045378f87Ef084E`. Both ctor args are chain-invariants (canonical escrow + `keccak256(type(HookCombinator).runtimeCode)`), so a single deploy per chain serves every operator that routes its post-action slot through `HookCombinator`. Live on every chain in `x402rChains` except Ethereum mainnet (deployer balance top-up pending).
- Owner / fee recipient on `ProtocolFeeConfig` is `0x773dBcB5BDb3Df8359ba4e42D7Ce7AE3fC9Ee235`; protocol-fee calculator is unset (`address(0)`), so `getProtocolFeeBps()` returns `0`.

**Workspace dev**
- `@x402r/sdk` and `@x402r/helpers` deps on `@x402r/core` switched to the `workspace:^` protocol (was `^0.2.0`) so local edits resolve through the workspace. `pnpm publish` substitutes the resolved version at publish time; consumer-facing `package.json` is unchanged.

---

## Migration: partial in-escrow refund (R-25)

The new `escrow.void()` is full-only — calling it empties the entire authorization in one transaction regardless of any amount the caller intends to refund. Under canonical `VOID_POST_ACTION_HOOK` wiring, "payer requests $30 refund on a $100 authorization" now ends with the payer receiving the full $100 and the merchant getting nothing. The replacement is **capture-then-refund**:

```ts
// 1. Merchant captures the full authorization first
await client.payment.capture(paymentInfo, fullAmount, data)

// 2. Merchant refunds the partial amount via ReceiverRefundCollector
//    (requires the merchant to have pre-staked an ERC-20 allowance on
//    ReceiverRefundCollector at SDK setup time)
await token.approve(receiverRefundCollector, partialAmount) // one-time setup
await client.payment.refund(paymentInfo, partialAmount, receiverRefundCollector, encodedData)
```

If the merchant doesn't carry a standing allowance, fall back to full void.

---

## Out of scope (PR 2/3/4 per `x402r-notes/plans/AUTHCAPTURE_SDK_MIGRATION.md`)

- `@x402r/helpers` scheme filter `'commerce' → 'authCapture'` (PR 2)
- `autoCapture` plumbing (PR 2)
- Permit2 support (PR 3)
- `x402rDefaults()` helper + new wire-format type re-exports (PR 4)
- Bumping `@x402r/evm` peerDep version (PR 2)
