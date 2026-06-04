---
"@x402r/core": patch
---

Update the canonical `paymentOperator` factory address to the v1.0.2 deployment `0xc24153B7ED8DC03e551F29DDEeA5CadFe57e2716` (Base mainnet + Base Sepolia). Operators from the previous v1.0.1 factory only expose the 4-arg `charge` and do not serve the facilitator's single-shot contract path; redeploy under v1.0.2 to use it.
