# E2E Integration Test

End-to-end test that exercises the full x402r refundable payment lifecycle against real contracts on Base Sepolia.

## Flow

```
Setup (3 accounts) → Deploy Operator → Construct PaymentInfo →
Authorize Payment (ERC-3009) → Request Refund → Freeze Payment →
Arbiter Approve Refund → Execute Refund
```

## Prerequisites

- **Node >= 20**, **pnpm 9.15+**
- Base Sepolia ETH (~0.01 for gas across all transactions)
- Base Sepolia USDC (0.01 USDC = 10,000 units at 6 decimals)
- A funded private key

## Usage

```bash
# From x402r-sdk root
pnpm build  # Must build SDK packages first
PRIVATE_KEY=0x... pnpm example:e2e-test
```

Or with optional overrides:

```bash
PRIVATE_KEY=0x... RPC_URL=https://your-rpc.com NETWORK_ID=eip155:84532 pnpm example:e2e-test
```

## Accounts

The script uses 3 accounts:

| Account | Source | Role |
|---------|--------|------|
| Payer | `PRIVATE_KEY` env var | Deploys operator, authorizes payment, requests refund, freezes |
| Merchant | Generated mnemonic (index 0) | Payment receiver |
| Arbiter | Generated mnemonic (index 1) | Approves refund, executes refund |

Merchant and arbiter accounts are funded with a small amount of ETH from the payer for gas.

## What It Tests

| Step | SDK Package | Methods |
|------|------------|---------|
| Deploy operator | `@x402r/core` | `deployMarketplaceOperator` |
| Authorize payment | `@x402r/core` | `toAbiPaymentInfo`, `PaymentOperatorABI` |
| Request refund | `@x402r/client` | `X402rClient.requestRefund()` |
| Freeze payment | `@x402r/client` | `X402rClient.freezePayment()`, `isFrozen()` |
| Approve refund | `@x402r/arbiter` | `X402rArbiter.approveRefundRequest()` |
| Execute refund | `@x402r/arbiter` | `X402rArbiter.executeRefundInEscrow()` |

## Key Implementation Details

- **ERC-3009 signing**: The authorize step uses `ReceiveWithAuthorization` (not ERC-20 `approve()`). The script computes a payer-agnostic escrow nonce and signs EIP-712 typed data.
- **feeReceiver must be the operator**: `PaymentInfo.feeReceiver` must equal the deployed operator contract address.
- **preApprovalExpiry = ERC-3009 validBefore**: Must be a future timestamp (not `0n`).
- **RPC delay**: A 2-second delay after each transaction allows Base Sepolia RPC state propagation.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRIVATE_KEY` | Yes | — | Private key of a funded Base Sepolia wallet |
| `RPC_URL` | No | `https://sepolia.base.org` | Base Sepolia RPC endpoint |
| `NETWORK_ID` | No | `eip155:84532` | Network identifier |
