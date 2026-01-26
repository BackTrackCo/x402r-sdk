# X402r SDK Roadmap

## v1.0 (Current)

### Core Package (@x402r/core)
- [ ] PaymentInfo, PaymentState, RequestStatus types
- [ ] Contract ABIs (PaymentOperator, RefundRequest, etc.)
- [ ] Network configuration (Base Sepolia)
- [ ] Error decoder utility
- [ ] Factory utilities (CREATE2 address computation)
- [ ] Condition builder (And/Or/Not composition)

### Client Package (@x402r/client)
- [ ] X402rClient class
- [ ] Payment queries (getPaymentState, getPaymentDetails, etc.)
- [ ] Refund operations (requestRefund, cancelRefundRequest, etc.)
- [ ] Escrow operations (freezePayment, isFrozen, etc.)
- [ ] Event subscriptions

### Merchant Package (@x402r/merchant)
- [ ] X402rMerchant class
- [ ] Payment operations (release, refundInEscrow)
- [ ] Refund handling (approveRefundRequest, denyRefundRequest)
- [ ] Server helpers (refundable, withRefund)
- [ ] Event subscriptions

### Arbiter Package (@x402r/arbiter)
- [ ] X402rArbiter class
- [ ] Decision submission (approveRefund, denyRefund)
- [ ] Batch operations
- [ ] AI arbiter hooks
- [ ] Event subscriptions

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
