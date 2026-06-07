---
"@x402r/helpers": patch
---

Drop the unused `@x402/evm` and `viem` peer dependencies — `@x402r/helpers` only requires `@x402/core` and `@x402r/evm` (which pulls the rest transitively).
