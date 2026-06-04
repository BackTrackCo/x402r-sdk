---
"@x402r/core": patch
---

Update the canonical `paymentOperator` factory address to the v1.0.2 deployment `0xc24153B7ED8DC03e551F29DDEeA5CadFe57e2716` (Base mainnet + Base Sepolia).

**Why:** `PaymentOperatorFactory` embeds `PaymentOperator`'s creation code, and `PaymentOperator.charge` was realigned to the escrow's 6-arg selector so the facilitator's contract-path `charge`/`autoCapture` flow dispatches into the operator instead of reverting. That source change shifts the factory's CREATE2 address, so it was redeployed under the `x402r-canonical-v1.0.2` salt namespace. Operators created by the previous v1.0.1 factory (`0xa0d4734842df1690a5B33Cb21828c946e39D55a2`) only expose the 4-arg `charge` and do not serve the single-shot contract path.

The other escrow-bound factories (`escrowPeriod`, `freeze`, `refundRequest`), the escrow, and `protocolFeeConfig` are unchanged.
