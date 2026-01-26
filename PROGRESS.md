# SDK Progress

## Current Phase: 4 - Merchant SDK

### Completed - Phase 1 & 2 (@x402r/core)
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
- [x] Implemented condition builder (conditions.and/or/not/staticAddress, condition ABIs, singletons)
- [x] Implemented shared utilities (computePaymentInfoHash, PAYMENT_INFO_TYPEHASH)

### Completed - Phase 3 (@x402r/client)
- [x] X402rClient class with constructor
- [x] Payment queries (getPaymentState, paymentExists, isInEscrow, getPaymentDetails, getMyPayments)
- [x] Refund operations (requestRefund, cancelRefundRequest, hasRefundRequest, getRefundStatus, getMyRefundRequests)
- [x] Escrow operations (freezePayment, unfreezePayment, isFrozen, getAuthorizationTime, isEscrowPeriodPassed)
- [x] Event subscriptions (watchPaymentState, watchRefundRequests, watchMyPayments, watchFreezeEvents)

### Up Next - Phase 4 (@x402r/merchant)
- [ ] X402rMerchant class with constructor
- [ ] Payment operations (release, refundInEscrow, getPaymentState, getReceiverPayments)
- [ ] Refund handling (approveRefundRequest, denyRefundRequest, getPendingRefundRequests)
- [ ] Escrow management (unfreezePayment, isFrozen)
- [ ] Event subscriptions (watchRefundRequests, watchReleases, watchFreezeEvents)
- [ ] Server helpers (refundable, withRefund)

### Up Next - Phase 5 (@x402r/arbiter)
- [ ] X402rArbiter class with constructor
- [ ] Decision submission (approveRefund, denyRefund, executeRefundInEscrow)
- [ ] Batch operations (batchApprove, batchDeny)
- [ ] Case queries (getPendingCases, getCaseDetails, getArbiterPayments)
- [ ] AI integration (CaseEvaluationContext, createWebhookHandler)

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
| Package | Tests | Status |
|---------|-------|--------|
| @x402r/core | 111 tests passing | Complete |
| @x402r/client | 50 tests passing | Complete |
| @x402r/merchant | 1 placeholder test | Not started |
| @x402r/arbiter | 1 placeholder test | Not started |

## Commits
- `d5fc054` - Initialize x402r-sdk monorepo
- `e181ccb` - Add progress tracking and ADRs
- `612a462` - Implement core types with TDD (100% coverage)
- `43df62c` - Add contract ABIs with tests (100% coverage)
- `03322fc` - Add network configuration with tests (100% coverage)
- `ecb4053` - Add error decoder with tests (100% coverage)
- `60104ba` - Add factory utilities with tests (100% coverage)
- `cf50dcb` - Add condition builder with tests (100% coverage)
- `5baceba` - Add shared utilities with tests (100% coverage)
- `ef7ff20` - Add X402rClient with payment queries (100% coverage)
