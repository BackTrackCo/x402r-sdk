---
"@x402r/core": minor
"@x402r/sdk": minor
---

Remove the redundant payer-side signing/Permit2 exports (`signReceiveAuthorization`, `signPermit2Authorization`, `createPermit2ApprovalTx`, `getPermit2AllowanceReadParams`, `PERMIT2_ADDRESS`, `computeEscrowNonce`) and their `@x402r/sdk` re-exports. Migrate payer signing to `@x402/evm/auth-capture/client`'s `AuthCaptureEvmScheme`; `computePaymentInfoHash` and `PAYMENT_INFO_TYPEHASH` are unchanged.
