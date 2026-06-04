---
"@x402r/core": patch
---

Point the SDK at the v1.0.2 operator and its 6-arg `charge`.

- `factories.paymentOperator` updated to the v1.0.2 deployment `0xc24153B7ED8DC03e551F29DDEeA5CadFe57e2716` (Base mainnet + Base Sepolia). The previous v1.0.1 factory's operators expose only the 4-arg `charge`.
- `charge` now encodes the escrow-shaped 6-arg form, so a direct charge dispatches into the v1.0.2 operator instead of no-opping. The operator ignores the supplied `feeBps` (recomputed internally) and requires `feeReceiver` to equal `paymentInfo.feeReceiver`.
- Regenerated contract ABIs against the canonical contracts (drops the unused Permit2 collector ABIs).
