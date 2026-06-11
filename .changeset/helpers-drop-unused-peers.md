---
"@x402r/helpers": patch
---

Drop the unused `@x402/evm` and `viem` peer dependencies — `@x402r/helpers` only requires `@x402/core` and `@x402r/evm`. Consumers still provide `viem` / `@x402/evm` via `@x402r/evm`'s own peer requirements.
