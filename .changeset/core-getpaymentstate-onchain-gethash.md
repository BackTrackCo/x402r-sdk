---
"@x402r/core": patch
---

`getPaymentState` (`getState`/`getAmounts`) now reads the payment hash from the escrow's on-chain `getHash` instead of computing it locally, adding one RPC read per call.
