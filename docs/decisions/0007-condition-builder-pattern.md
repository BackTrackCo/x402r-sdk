# ADR-0007: Condition Builder Pattern

## Status
Accepted

## Context
The PaymentOperator uses ICondition contracts for access control. Conditions can be composed using And, Or, and Not logic. Users need an intuitive API to build condition trees.

## Decision
Implement a condition builder with fluent API for composing conditions.

**API:**
```typescript
import { conditions } from '@x402r/core';

// Singletons (pre-deployed)
conditions.PAYER           // PayerCondition
conditions.RECEIVER        // ReceiverCondition
conditions.ALWAYS_TRUE     // AlwaysTrueCondition

// Factory functions
conditions.staticAddress(addr)   // StaticAddressCondition
conditions.and([a, b])           // AndCondition
conditions.or([a, b])            // OrCondition
conditions.not(a)                // NotCondition

// Example: receiver OR designated arbiter
const releaseCondition = conditions.or([
  conditions.RECEIVER,
  await conditions.staticAddress(arbiterAddress)
]);
```

**Implementation:**
- Singleton conditions return pre-deployed addresses
- Factory functions use CREATE2 for deterministic addresses
- Composed conditions are deployed lazily

## Consequences

**Positive:**
- Intuitive API for condition composition
- Type-safe condition building
- Deterministic addresses via CREATE2
- Reusable singleton conditions

**Negative:**
- Users need to understand condition composition
- Multiple transactions may be needed for complex conditions

## Alternatives Considered

1. **Manual address management** - Error-prone and tedious
2. **String-based DSL** - Less type-safe, harder to validate
3. **Builder pattern with methods** - More verbose than functional composition
