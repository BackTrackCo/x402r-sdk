# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### @x402r/core
- Core types: `PaymentInfo`, `PaymentState`, `RequestStatus`, `RefundRequestData`
- Contract ABIs: PaymentOperator, RefundRequest, EscrowPeriodRecorder, FreezePolicy, and more
- Network configuration for Base Sepolia (chain ID 84532)
- Error decoder with custom error types (`X402rError`, `decodeContractError`)
- Factory utilities for deploying PaymentOperator, EscrowPeriod, FreezePolicy contracts
- Condition builder (`conditions.and/or/not/staticAddress`, singletons)
- Shared utilities (`computePaymentInfoHash`, `PAYMENT_INFO_TYPEHASH`)

#### @x402r/client
- `X402rClient` class for payer interactions
- Payment queries: `getPaymentState`, `paymentExists`, `isInEscrow`, `getPaymentDetails`, `getMyPayments`
- Refund operations: `requestRefund`, `cancelRefundRequest`, `hasRefundRequest`, `getRefundStatus`, `getMyRefundRequests`
- Escrow operations: `freezePayment`, `unfreezePayment`, `isFrozen`, `getAuthorizationTime`, `isEscrowPeriodPassed`
- Event subscriptions: `watchPaymentState`, `watchRefundRequests`, `watchMyPayments`, `watchFreezeEvents`

#### @x402r/merchant
- `X402rMerchant` class for merchant interactions
- Payment operations: `release`, `refundInEscrow`, `getPaymentState`, `getReceiverPayments`, `getPaymentAmounts`
- Refund handling: `approveRefundRequest`, `denyRefundRequest`, `getPendingRefundRequests`, `hasRefundRequest`, `getRefundStatus`
- Escrow management: `unfreezePayment`, `isFrozen`
- Server helpers: `refundable`, `withRefund`
- Event subscriptions: `watchRefundRequests`, `watchReleases`, `watchFreezeEvents`

#### @x402r/arbiter
- `X402rArbiter` class for arbiter interactions
- Decision submission: `approveRefund`, `denyRefund`, `executeRefundInEscrow`
- Batch operations: `batchApprove`, `batchDeny`
- Case queries: `getPendingCases`, `getRefundStatus`, `getArbiterPayments`
- AI integration: `CaseEvaluationContext`, `DecisionResult`, `createWebhookHandler`
- Event subscriptions: `watchNewCases`, `watchDecisions`, `watchFreezeEvents`

#### Documentation
- TypeDoc API reference auto-generated to GitHub Pages
- SDK documentation (22 pages) at docs.x402r.org
- README with quick start examples

### Infrastructure
- Monorepo setup with Turborepo and pnpm workspaces
- Vitest configured with coverage reporting
- tsup configured for ESM builds
- GitHub Actions for API documentation generation and deployment
