# E2E Integration Test

End-to-end test that exercises the full x402r refundable payment lifecycle against real contracts on Base Sepolia.

## Flow

```
Setup (3 accounts) → Deploy Operator → Construct PaymentInfo →
Authorize Payment (ERC-3009) → Request Refund → Freeze Payment →
Payer Submits Evidence → Merchant Submits Counter-Evidence →
Arbiter Reads All Evidence → Arbiter Approves Refund →
Execute Refund → Final Verification
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
| 1. Setup accounts | — | Generate payer, merchant, arbiter wallets |
| 2. Deploy operator | `@x402r/core` | `deployMarketplaceOperator` |
| 3. Construct PaymentInfo | `@x402r/core` | `toAbiPaymentInfo`, `validatePaymentInfo`, `resolveAddresses` |
| 4. Authorize payment | `@x402r/core` | `computeEscrowNonce`, `signERC3009Authorization` |
| 4b. Verify post-authorize state | all | `getPaymentState`, `paymentExists`, `isInEscrow`, `getPayerPayments`, `getReceiverPayments`, `getPaymentAmounts` |
| 5. Request refund | `@x402r/client` | `X402rClient.requestRefund()` |
| 6. Freeze payment | `@x402r/client` | `X402rClient.freezePayment()`, `isFrozen()` |
| 7. Payer submits evidence | `@x402r/client` | `X402rClient.submitEvidence()`, `getEvidenceCount()` |
| 8. Merchant submits counter-evidence | `@x402r/merchant` | `X402rMerchant.submitEvidence()` |
| 9. Arbiter reads all evidence | `@x402r/arbiter` | `X402rArbiter.getAllEvidence()` |
| 10. Approve refund | `@x402r/arbiter` | `X402rArbiter.approveRefundRequest()` |
| 11. Execute refund | `@x402r/arbiter` | `X402rArbiter.executeRefundInEscrow()` |
| 11b. Verify post-refund state | all | `getPaymentState` (Settled), `isInEscrow` (false), `getPaymentAmounts` (0/0) |
| 12. Final verification | all | Evidence persists, escrow emptied, USDC returned |

## Key Implementation Details

- **ERC-3009 signing**: The authorize step uses `ReceiveWithAuthorization` (not ERC-20 `approve()`). Uses `computeEscrowNonce()` and `signERC3009Authorization()` from `@x402r/core`.
- **PaymentInfo validation**: `validatePaymentInfo()` checks feeReceiver, expiry, amount, and fee bounds before on-chain transactions.
- **Address resolution**: `resolveAddresses()` provides all protocol contract addresses for SDK construction.
- **Hash computation**: The escrow contract's `getHash()` pure function computes the payment info hash on-chain. The SDK calls this internally — callers never handle hashes directly.
- **feeReceiver must be the operator**: `PaymentInfo.feeReceiver` must equal the deployed operator contract address.
- **preApprovalExpiry = ERC-3009 validBefore**: Must be a future timestamp (not `0n`).
- **RPC delay**: A 2-second delay after each transaction allows Base Sepolia RPC state propagation.
- **Event log range**: Base Sepolia RPC limits `eth_getLogs` to 10,000 blocks — `getPayerPayments`/`getReceiverPayments` require a `fromBlock` parameter.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRIVATE_KEY` | Yes | — | Private key of a funded Base Sepolia wallet |
| `RPC_URL` | No | `https://sepolia.base.org` | Base Sepolia RPC endpoint |
| `NETWORK_ID` | No | `eip155:84532` | Network identifier |
