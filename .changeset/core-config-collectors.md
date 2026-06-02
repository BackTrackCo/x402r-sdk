---
"@x402r/core": minor
"@x402r/helpers": minor
---

Add `collectors` (`{ eip3009, permit2 }`) and `getCollectorAddress(chainId, method)` to resolve a payment collector by transfer method (re-exported from `@x402r/helpers`). Remove `tokenCollector` — use `collectors.eip3009` or `getCollectorAddress(id, 'eip3009')`.
