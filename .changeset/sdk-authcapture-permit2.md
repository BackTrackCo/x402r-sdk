---
"@x402r/core": minor
"@x402r/sdk": minor
"@x402r/cli": patch
---

Permit2 support (PR 3 of authCapture migration).

**New**

- `@x402r/core/payment/permit2`: `signPermit2Authorization`, `createPermit2ApprovalTx`, `getPermit2AllowanceReadParams`, `PERMIT2_ADDRESS`. Parallels `signReceiveAuthorization` — returns `{collectorData, tokenCollector}` suitable for direct `payment.charge` / `payment.authorize`. `collectorData` is the raw 65-byte EOA signature (commerce-payments' Permit2PaymentCollector forwards it straight to `permit2.permitTransferFrom`).
- `@x402r/sdk`: re-exports the four `@x402r/core` Permit2 surfaces above.
- `@x402r/cli`: `--asset-transfer-method <eip3009|permit2>` flag — filters `accepts[]` in addition to `--chain`. Errors on unknown value or empty match set with a `Malformed402Error` (exit code 2).
- New scenario: `examples/scenarios/permit2-charge.ts`. Demonstrates the one-time `ERC20.approve(PERMIT2, MAX)` step and an atomic Permit2 charge with balance-delta assertions.
