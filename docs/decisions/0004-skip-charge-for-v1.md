# ADR-0004: Skip charge() and refundPostEscrow() for v1

## Status
Accepted

## Context
The PaymentOperator contract supports:
- `authorize()` - Lock funds in escrow
- `release()` - Release funds to receiver
- `refundInEscrow()` - Refund while funds are in escrow
- `charge()` - Immediate settlement (authorize + full release)
- `refundPostEscrow()` - Refund after funds released (requires receiver approval)

## Decision
Skip `charge()` and `refundPostEscrow()` in v1 to simplify the initial release.

**Reasoning:**
- `charge()` is a convenience function that can be implemented manually (authorize + release)
- `refundPostEscrow()` is a complex flow that requires post-release refund mechanics
- Both add complexity without addressing core escrow use cases
- Can be added in v1.1 once core functionality is stable

## Consequences

**Positive:**
- Simpler initial API surface
- Faster time to v1 release
- Clearer documentation for core flows

**Negative:**
- Users wanting immediate settlement must call authorize + release manually
- Post-release refunds not supported until v1.1

## Alternatives Considered

1. **Include everything** - Would delay v1 release and complicate initial documentation
2. **Include charge() only** - Partial solution, still missing post-escrow refunds

## Future Work
- v1.1: Add `charge()` method to all SDKs
- v1.1: Add `refundPostEscrow()` with receiver approval flow
