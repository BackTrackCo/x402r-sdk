---
"@x402r/core": minor
"@x402r/sdk": minor
"@x402r/cli": patch
---

Add Permit2 payer-side helpers.

**New**

- `@x402r/core/payment/permit2`: `signPermit2Authorization`, `createPermit2ApprovalTx`, `getPermit2AllowanceReadParams`, and the `PERMIT2_ADDRESS` constant. Parallels `signReceiveAuthorization` — returns `{collectorData, tokenCollector}` suitable for `payment.charge` / `payment.authorize`. `collectorData` is the raw 65-byte EOA signature.
- `@x402r/sdk` re-exports the four Permit2 surfaces.
- `@x402r/cli` adds `--asset-transfer-method <eip3009|permit2>` to filter `accepts[]` alongside `--chain`. Invalid value or empty match set errors with a `Malformed402Error` (exit code 2).
