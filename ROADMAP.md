# X402r SDK Roadmap

## v1.0 (Current)

### Core Package (@x402r/core) - COMPLETE
- [x] PaymentInfo, PaymentState, RequestStatus types
- [x] Contract ABIs (PaymentOperator, RefundRequest, etc.)
- [x] Network configuration (Base Sepolia)
- [x] Error decoder utility
- [x] Factory utilities (CREATE2 address computation)
- [x] Condition builder (And/Or/Not composition)
- [x] Shared utilities (computePaymentInfoHash)

### Client Package (@x402r/client) - COMPLETE
- [x] X402rClient class with constructor
- [x] Payment queries (getPaymentState, paymentExists, isInEscrow, getPaymentDetails, getMyPayments)
- [x] Refund operations (requestRefund, cancelRefundRequest, hasRefundRequest, getRefundStatus, getMyRefundRequests)
- [x] Escrow operations (freezePayment, unfreezePayment, isFrozen, getAuthorizationTime, isEscrowPeriodPassed)
- [x] Event subscriptions (watchPaymentState, watchRefundRequests, watchMyPayments, watchFreezeEvents)

### Merchant Package (@x402r/merchant) - COMPLETE
- [x] X402rMerchant class with constructor
- [x] Payment operations (release, refundInEscrow, getPaymentState, getReceiverPayments, getPaymentAmounts)
- [x] Refund handling (approveRefundRequest, denyRefundRequest, getPendingRefundRequests, hasRefundRequest, getRefundStatus)
- [x] Escrow management (unfreezePayment, isFrozen)
- [x] Server helpers (refundable, withRefund)
- [x] Event subscriptions (watchRefundRequests, watchReleases, watchFreezeEvents)

### Arbiter Package (@x402r/arbiter) - COMPLETE
- [x] X402rArbiter class with constructor
- [x] Decision submission (approveRefund, denyRefund, executeRefundInEscrow)
- [x] Batch operations (batchApprove, batchDeny)
- [x] Case queries (getPendingCases, getRefundStatus, getArbiterPayments)
- [x] AI integration (CaseEvaluationContext, DecisionResult, createWebhookHandler)
- [x] Event subscriptions (watchNewCases, watchDecisions, watchFreezeEvents)

### Examples & Documentation
- [ ] client-basic example
- [ ] merchant-express example
- [ ] arbiter-ai example
- [ ] mcp-integration example
- [ ] TypeDoc API reference

## v1.1 (Planned)

- [ ] charge() - Immediate settlement without escrow
- [ ] refundPostEscrow() - Post-release refunds
- [ ] Fee management utilities
- [ ] Multi-network support (Base Mainnet)

## v2.0 (Future)

- [ ] Evidence/metadata system (XMTP, IPFS plugins)
- [ ] Partial refund negotiations
- [ ] Multi-arbiter support
- [ ] Session-based billing patterns
