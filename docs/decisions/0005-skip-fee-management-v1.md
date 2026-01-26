# ADR-0005: Skip Fee Management for v1

## Status
Accepted

## Context
The PaymentOperator contract accumulates fees that need to be distributed to the fee recipient. This requires:
- Tracking accumulated fees per token
- Distributing fees to the fee recipient
- Potentially configurable fee parameters

## Decision
Skip comprehensive fee management utilities in v1, providing only a basic `distributeFees()` utility in @x402r/core.

**v1 scope:**
- `distributeFees(publicClient, walletClient, operatorAddress, token)` - Simple utility to trigger fee distribution

**Deferred to v1.1:**
- Fee accumulation queries
- Fee history tracking
- Fee configuration utilities
- Multi-token fee management

## Consequences

**Positive:**
- Simpler v1 release
- Focus on core payment flows
- Fee distribution still possible via basic utility

**Negative:**
- Limited visibility into accumulated fees
- Manual token management for multi-token operators

## Alternatives Considered

1. **Full fee management** - Would add complexity for a secondary concern
2. **No fee utilities** - Would make fee distribution inconvenient

## Future Work
- v1.1: Add fee accumulation queries
- v1.1: Add fee history tracking
- v1.1: Add multi-token fee management
