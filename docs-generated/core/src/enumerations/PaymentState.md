[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / PaymentState

# Enumeration: PaymentState

Defined in: [core/src/types/index.ts:17](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L17)

Payment lifecycle states matching the Solidity enum

STATE MACHINE:
- NonExistent → InEscrow: authorize()
- InEscrow → Released: release() / capture()
- InEscrow → Settled: full refundInEscrow(), void(), or reclaim()
- InEscrow → Expired: authorizationExpiry passed
- Released → Settled: full refundPostEscrow() or refundExpiry passed
- Expired → Settled: reclaim() called by payer

## Enumeration Members

### Expired

> **Expired**: `4`

Defined in: [core/src/types/index.ts:27](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L27)

Authorization expired, payer can reclaim via escrow.reclaim()

***

### InEscrow

> **InEscrow**: `1`

Defined in: [core/src/types/index.ts:21](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L21)

Payment authorized, funds locked in escrow (capturableAmount > 0)

***

### NonExistent

> **NonExistent**: `0`

Defined in: [core/src/types/index.ts:19](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L19)

Payment has never been authorized through this operator

***

### Released

> **Released**: `2`

Defined in: [core/src/types/index.ts:23](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L23)

Funds released to receiver, may still be refundable (refundableAmount > 0)

***

### Settled

> **Settled**: `3`

Defined in: [core/src/types/index.ts:25](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L25)

Payment settled - no funds in escrow or refundable
