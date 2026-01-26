[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [client/src](../README.md) / PaymentState

# Enumeration: PaymentState

Defined in: core/dist/types/index.d.ts:16

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

Defined in: core/dist/types/index.d.ts:26

Authorization expired, payer can reclaim via escrow.reclaim()

***

### InEscrow

> **InEscrow**: `1`

Defined in: core/dist/types/index.d.ts:20

Payment authorized, funds locked in escrow (capturableAmount > 0)

***

### NonExistent

> **NonExistent**: `0`

Defined in: core/dist/types/index.d.ts:18

Payment has never been authorized through this operator

***

### Released

> **Released**: `2`

Defined in: core/dist/types/index.d.ts:22

Funds released to receiver, may still be refundable (refundableAmount > 0)

***

### Settled

> **Settled**: `3`

Defined in: core/dist/types/index.d.ts:24

Payment settled - no funds in escrow or refundable
