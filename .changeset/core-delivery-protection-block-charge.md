---
"@x402r/core": minor
---

Delivery-protection operator preset now blocks the immediate-charge path.

`previewDeliveryProtectionOperator` / `deployDeliveryProtectionOperator` wire
`chargeCondition` to a `NotCondition(AlwaysTrue)` (always returns false) instead
of `zeroAddress`. In `PaymentOperator`, a `zeroAddress` condition means "always
allow", so leaving the charge slot empty let anyone call `charge()` to settle a
delivery-protected payment immediately and skip the escrow hold — defeating the
protection. Payments must now go through `authorize` -> `release`/`refund`.

Note: this changes the deterministic address of delivery-protection operators,
and the preset now deploys one additional contract (the `NotCondition`).
