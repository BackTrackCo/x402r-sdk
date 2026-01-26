# SDK Progress

## Current Phase: 1 - Core Foundation

### Completed
- [x] Monorepo setup (Turborepo + pnpm + tsup)
- [x] Vitest with coverage reporting configured
- [x] Package structure created (@x402r/core, @x402r/client, @x402r/merchant, @x402r/arbiter)

### In Progress
- [ ] Create PROGRESS.md, ROADMAP.md, TODO.md
- [ ] Create initial ADRs (0001-0007)

### Up Next
- [ ] Types and ABIs (TDD)
- [ ] Network configuration
- [ ] Error decoder

## Blocked
- [ ] Base Mainnet addresses - waiting on deployment

## Skipped (v1)
| Feature | Reason | ADR | Future Version |
|---------|--------|-----|----------------|
| charge() | Simplify v1 scope | ADR-0004 | v1.1 |
| refundPostEscrow() | Needs charge() first | ADR-0004 | v1.1 |
| Fee management | Low priority | ADR-0005 | v1.1 |
| Evidence/metadata | Needs design work | ADR-0006 | v2.0 |

## Test Status
| Package | Coverage | Status |
|---------|----------|--------|
| @x402r/core | 0% | Not started |
| @x402r/client | 0% | Not started |
| @x402r/merchant | 0% | Not started |
| @x402r/arbiter | 0% | Not started |

## Commits
- `d5fc054` - Initialize x402r-sdk monorepo
