# SDK Progress

## Current Phase: 1 - Core Foundation

### Completed
- [x] Monorepo setup (Turborepo + pnpm + tsup)
- [x] Vitest with coverage reporting configured
- [x] Package structure created (@x402r/core, @x402r/client, @x402r/merchant, @x402r/arbiter)
- [x] Created PROGRESS.md, ROADMAP.md, TODO.md
- [x] Created initial ADRs (0001-0007)
- [x] Implemented core types (PaymentState, RequestStatus, PaymentInfo) with 100% coverage
- [x] Extracted ABIs from contracts (PaymentOperator, RefundRequest, EscrowPeriodRecorder, etc.)
- [x] Implemented network configuration (NETWORK_CONFIG, getNetworkConfig, isSupportedNetwork)
- [x] Implemented error decoder (X402rError, decodeContractError, CONTRACT_ERRORS)
- [x] Implemented factory utilities (PaymentOperatorConfig, EscrowPeriodConfig, FreezePolicyConfig, factory ABIs)

### In Progress
- [ ] Condition builder (Phase 2.2)

### Up Next
- [ ] Shared utilities (Phase 2.3)

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
| @x402r/core | 100% (types, abis, config, errors, factory) | In progress |
| @x402r/client | 0% | Not started |
| @x402r/merchant | 0% | Not started |
| @x402r/arbiter | 0% | Not started |

## Commits
- `d5fc054` - Initialize x402r-sdk monorepo
- `e181ccb` - Add progress tracking and ADRs
- `612a462` - Implement core types with TDD (100% coverage)
- `43df62c` - Add contract ABIs with tests (100% coverage)
- `03322fc` - Add network configuration with tests (100% coverage)
- `ecb4053` - Add error decoder with tests (100% coverage)
- (pending) - Add factory utilities with tests
