# X402r SDK TODO

Quick reference for current tasks. See PROGRESS.md for detailed status.

## Completed

### Phase 1 & 2 (@x402r/core)
- [x] Create ADRs (0001-0007)
- [x] Implement types with tests (111 tests passing)
- [x] Extract ABIs from contracts
- [x] Implement network config
- [x] Implement error decoder
- [x] Factory utilities
- [x] Condition builder
- [x] Shared utilities

### Phase 3 (@x402r/client)
- [x] X402rClient class with constructor
- [x] Payment queries (getPaymentState, paymentExists, isInEscrow, getPaymentDetails, getMyPayments)
- [x] Refund operations (requestRefund, cancelRefundRequest, hasRefundRequest, getRefundStatus, getMyRefundRequests)
- [x] Escrow operations (freezePayment, unfreezePayment, isFrozen, getAuthorizationTime, isEscrowPeriodPassed)
- [x] Event subscriptions (watchPaymentState, watchRefundRequests, watchMyPayments, watchFreezeEvents)

## Current (Phase 4 - @x402r/merchant)
- [ ] X402rMerchant class with constructor
- [ ] Payment operations (release, refundInEscrow, getPaymentState, getReceiverPayments)
- [ ] Refund handling (approveRefundRequest, denyRefundRequest, getPendingRefundRequests)
- [ ] Escrow management (unfreezePayment, isFrozen)
- [ ] Server helpers (refundable, withRefund)
- [ ] Event subscriptions (watchRefundRequests, watchReleases, watchFreezeEvents)

## Next Up (Phase 5 - @x402r/arbiter)
- [ ] X402rArbiter class with constructor
- [ ] Decision submission (approveRefund, denyRefund, executeRefundInEscrow)
- [ ] Batch operations (batchApprove, batchDeny)
- [ ] Case queries (getPendingCases, getCaseDetails, getArbiterPayments)
- [ ] AI integration (CaseEvaluationContext, createWebhookHandler)

## Blocked
- **Base Mainnet addresses** - Waiting on contract deployment

## Notes
- All implementations follow TDD: write test first, then implement
- Update PROGRESS.md after each milestone
- Coverage targets: core 90%, client/merchant 80%, arbiter 75%
- Total tests: 163 passing (core: 111, client: 50, merchant: 1, arbiter: 1)
