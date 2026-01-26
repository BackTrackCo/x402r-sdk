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

### Phase 4 (@x402r/merchant)
- [x] X402rMerchant class with constructor
- [x] Payment operations (release, refundInEscrow, getPaymentState, getReceiverPayments, getPaymentAmounts)
- [x] Refund handling (approveRefundRequest, denyRefundRequest, getPendingRefundRequests, hasRefundRequest, getRefundStatus)
- [x] Escrow management (unfreezePayment, isFrozen)
- [x] Server helpers (refundable, withRefund)
- [x] Event subscriptions (watchRefundRequests, watchReleases, watchFreezeEvents)

### Phase 5 (@x402r/arbiter)
- [x] X402rArbiter class with constructor
- [x] Decision submission (approveRefund, denyRefund, executeRefundInEscrow)
- [x] Batch operations (batchApprove, batchDeny)
- [x] Case queries (getPendingCases, getRefundStatus, getArbiterPayments)
- [x] AI integration (CaseEvaluationContext, DecisionResult, createWebhookHandler)
- [x] Event subscriptions (watchNewCases, watchDecisions, watchFreezeEvents)

## Up Next (Phase 6 - Examples & Documentation)

### Done
- [x] TypeDoc API reference (backtrackco.github.io/x402r-sdk)
- [x] SDK documentation (22 pages at docs.x402r.org/sdk)
- [x] README.md for SDK repo

### Remaining
- [ ] client-basic example
- [ ] merchant-express example
- [ ] arbiter-ai example
- [ ] mcp-integration example

## Blocked
- **Base Mainnet addresses** - Waiting on contract deployment

## Notes
- All implementations follow TDD: write test first, then implement
- Update PROGRESS.md after each milestone
- Coverage targets: core 90%, client/merchant 80%, arbiter 75%
- Total tests: 238 passing (core: 111, client: 50, merchant: 38, arbiter: 39)
