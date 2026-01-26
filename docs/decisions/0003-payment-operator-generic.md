# ADR-0003: Generic PaymentOperator Design

## Status
Accepted

## Context
The x402r contracts evolved from a specialized ArbitrationOperator to a generic PaymentOperator that uses pluggable conditions and recorders.

## Decision
Design the SDK around the generic PaymentOperator contract instead of the deprecated ArbitrationOperator.

**Key changes:**
- `PaymentOperator` replaces `ArbitrationOperator`
- `PaymentOperatorFactory` replaces `ArbitrationOperatorFactory`
- `StaticAddressCondition` (per-deploy) replaces `ArbiterCondition` (singleton)
- `FEE_RECIPIENT` replaces `ARBITER` as the generic term

**Condition system:**
- `ICondition` interface for access control
- `IRecorder` interface for state recording
- Composable conditions (And, Or, Not)
- Singleton conditions (Payer, Receiver, AlwaysTrue)

## Consequences

**Positive:**
- More flexible operator configuration
- Supports various use cases beyond arbitration
- Better separation of concerns
- CREATE2 deterministic addresses for operators

**Negative:**
- More complexity in factory utilities
- Users need to understand condition composition

## Alternatives Considered

1. **Keep ArbitrationOperator** - Would limit use cases to arbitration only
2. **Multiple specialized operators** - Would require more SDK packages
