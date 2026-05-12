---
"@x402r/core": major
"@x402r/helpers": major
"@x402r/cli": major
---

authCapture wire format + autoCapture (PR 2/4 of authCapture migration).

Combines PR 2 + PR 4 of the migration into a single PR. Builds on PR 1 (#122).

**Breaking**

- `@x402r/helpers` `forwardToArbiter` skips settlements whose scheme is not `'authCapture'` (was `'commerce'`). Update any merchant backend that produced `PaymentRequirements` with `scheme: 'commerce'`.
- `@x402r/evm` peerDep bumped to `^0.2.0-alpha.0` on `@x402r/core`, `@x402r/helpers`. CLI dep bumped to the same range. The new wire format renames `operatorAddress` → `captureAuthorizer`, moves `salt` onto the payload, uses absolute Unix-seconds deadlines, and adds `autoCapture` + `assetTransferMethod` to `PaymentRequirements.extra`. Tracked under the `alpha` dist-tag during prerelease; once `@x402r/evm@0.2.0` ships, the same constraint accepts the final.
- `@x402r/core/payment` `toPaymentInfo()` now takes `PaymentInfoStruct` from `@x402r/evm` (was `EscrowPayload`, removed in `0.2.0-alpha.0`). The new struct includes `payer` baked in, so the function collapses to a string→bigint converter on the on-chain shape.
- `@x402r/cli` switches its `@x402r/evm` import from `commerce/client` (`registerCommerceEvmScheme`) to `authCapture/client` (`registerAuthCaptureEvmScheme`).

**New**

- `x402rDefaults({ captureAuthorizer, feeRecipient, captureDeadline?, refundDeadline?, minFeeBps?, maxFeeBps?, name?, version?, autoCapture?, assetTransferMethod? }) → AuthCaptureExtra` from `@x402r/helpers`. Quick-start builder with sensible defaults: deadlines (`now + 1h` / `now + 7d`), fee policy (`0`–`100` bps), token domain (`USDC` / `2`). Only the two deployment-specific addresses (`captureAuthorizer`, `feeRecipient`) are required. Optional `autoCapture` / `assetTransferMethod` pass through unchanged so the facilitator's defaults take over when unset.
- Wire-format type re-exports from `@x402r/helpers`: `AuthCaptureExtra`, `AuthCapturePayload`, `Eip3009Payload`, `Permit2Payload`, `PaymentInfoStruct`, plus payload type guards (`isAuthCaptureExtra`, `isAuthCapturePayload`, `isEip3009Payload`, `isPermit2Payload`). Consumers building merchant-server payment requirements don't need a direct `@x402r/evm` dep. `@x402r/sdk` does not re-export these — direct consumers of wire-format types should import from `@x402r/helpers` or `@x402r/evm`.
- New scenario `examples/scenarios/atomic-charge.ts` exercises atomic settlement via `payment.charge()` on anvil (single tx, no escrow). Documents the wire-format `autoCapture` flag inline.
- New scenario `examples/scenarios/partial-refund-flow.ts` exercises the new partial-refund pattern: `capture(partial)` then `voidPayment()` returns the remainder to the payer.

**Docs**

- `@x402r/core` README: opt-in note for direct-`@x402r/core` consumers on hook query scoping (`operatorAddress?` filter — landed in PR 1, surfaced at the top level here).
- `@x402r/sdk` README: trimmed protocol-depth content from the "Refund & Dispute Flow" section; moved to new top-level `MIGRATION.md`.

**Out of scope (PR 3)**

- Permit2 helper re-exports + `assetTransferMethod` dispatch in payment helpers + CLI flag.
