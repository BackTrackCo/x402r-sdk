# Migration Notes

Protocol-depth content extracted from package READMEs. Quick-start / API surface lives in the per-package READMEs; this file captures non-obvious refund-and-dispute behaviors and the authCapture wire-format migration paths.

For the full migration plan (rationale, sequence, scope decisions across PR 1/2/3/4), see `x402r-notes/plans/AUTHCAPTURE_SDK_MIGRATION.md`.

## Refund & Dispute Flow — Non-Obvious Behaviors

Integrator notes pulled from `@x402r/sdk` README for depth without bloating the quick-start.

### In-escrow void auto-approves payer requests

The RefundRequest hook is wired as `voidPostActionHook`, so any successful `payment.voidPayment()` call atomically settles a pending `RefundRequest` in the same transaction. No separate approve step. `voidPayment` is full-only — it empties the entire authorization regardless of any partial amount the payer requested. For partial refunds, use the capture+void pattern (see below + `examples/scenarios/partial-refund-flow.ts`).

### Evidence access control

Arbiter identity comes from `REFUND_REQUEST.ARBITER()`, not from the operator's condition tree. If arbiter is a multisig, that address must call `submitEvidence()` — the operator's condition graph does not gate it.

### Post-escrow refunds use ReceiverRefundCollector

Once the escrow window closes, the receiver calls:

```ts
payment.refund(paymentInfo, amount, receiverRefundCollector, data)
```

via the Receiver singleton condition. The merchant must pre-stake an ERC-20 allowance on `ReceiverRefundCollector` (use `payment.approveRefundAllowance(token, amount)`). No arbiter involvement.

### `payment.voidPayment` is gated by an OrCondition

On marketplace operators, the `voidPreActionCondition` is `OrCondition(ReceiverCondition, StaticAddressCondition(refundRequest))`, so either the receiver or the RefundRequest contract can trigger it. Payers cannot void directly; they file a `RefundRequest` first, and either the merchant or the arbiter approves by calling `voidPayment` themselves.

### Recovery if partial-capture's second tx never lands

The partial-refund pattern is two transactions (`capture(merchantAmount)` then `voidPayment()`; see `examples/scenarios/partial-refund-flow.ts`). If the second tx never executes (crash, gas exhaustion, key loss), the payer's remainder sits in escrow under the original authorization. Recovery is on-chain via `AuthCaptureEscrow.reclaim(paymentInfo)`, callable by the payer after `paymentInfo.refundExpiry`. The SDK does not currently ship a `payment.reclaim()` wrapper; call the contract directly:

```ts
walletClient.writeContract({
  address: authCaptureEscrow,
  abi: authCaptureEscrowAbi,
  functionName: 'reclaim',
  args: [paymentInfo],
})
```

A typed wrapper is in the post-migration backlog.

## Docs

[docs.x402r.org](https://docs.x402r.org) is the canonical home for deeper protocol coverage.
