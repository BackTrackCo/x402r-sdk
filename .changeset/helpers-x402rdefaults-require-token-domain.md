---
"@x402r/helpers": minor
---

`x402rDefaults` now requires explicit `name`/`version` (the EIP-712 token domain). The silent `USDC`/`2` default is removed — it caused on-chain settle reverts for non-USDC tokens and for mainnet USDC (`USD Coin`). Pass them explicitly.
