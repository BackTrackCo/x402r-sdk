---
"@x402r/core": minor
"@x402r/helpers": minor
---

Add `collectors: { eip3009, permit2 }` to chain config to resolve the canonical commerce-payments collector by transfer method, and remove the stale single-valued `tokenCollector` field + const. Migrate `tokenCollector` -> `collectors.eip3009` (or `.permit2`).
