# E2E Integration Test

End-to-end test that exercises the full x402r refundable payment lifecycle against real contracts on Base Sepolia.

## Flow

```
Setup (3 accounts) -> Deploy Operator -> HTTP 402 Payment Flow ->
Request Refund -> Freeze Payment -> Payer Submits Evidence ->
Merchant Submits Counter-Evidence -> Arbiter Reads All Evidence ->
Arbiter Approves Refund -> Verify Refund -> Final Verification
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
| Payer | `PRIVATE_KEY` env var | Deploys operator, authorizes payment, requests refund |
| Merchant | Generated mnemonic (index 0) | Payment receiver, submits counter-evidence |
| Arbiter | Generated mnemonic (index 1) | Freezes payment, approves refund |

Merchant and arbiter accounts are funded with a small amount of ETH from the payer for gas.

## What It Tests

| Step | SDK Client | Methods |
|------|------------|---------|
| 1. Setup accounts | -- | Generate payer, merchant, arbiter wallets |
| 2. Deploy operator | `@x402r/core` | `deployMarketplaceOperator` |
| 3. Setup HTTP 402 | `@x402/core`, `@x402r/evm` | In-process facilitator, resource server, HTTP client |
| 4. Authorize payment | `@x402/core` | `performHTTP402Payment` (full 402 -> pay -> verify -> settle flow) |
| 4b. Verify post-authorize state | `@x402r/sdk` | `payer.payment.getState()`, `merchant.payment.getAmounts()`, `arbiter.payment.getState()` |
| 5. Request refund | `PayerClient` | `payer.refund.request()`, `payer.refund.getStatus()` |
| 6. Freeze payment | `ArbiterClient` | `arbiter.freeze.freeze()`, `arbiter.freeze.isFrozen()` |
| 7. Payer submits evidence | `PayerClient` | `payer.evidence.submit()`, `payer.evidence.count()` |
| 8. Merchant submits counter-evidence | `MerchantClient` | `merchant.evidence.submit()` |
| 9. Arbiter reads all evidence | `ArbiterClient` | `arbiter.evidence.count()`, `arbiter.evidence.getBatch()` |
| 10. Approve refund | `ArbiterClient` | `arbiter.refund.approve()`, `arbiter.refund.get()` |
| 11. Verify atomic refund | all | Escrow state zeroed, USDC returned to payer |
| 11b. Verify post-refund state | all | `payer.payment.getState()`, `merchant.payment.getAmounts()` |
| 12. Final verification | all | Evidence persists, escrow emptied, USDC returned, status Approved |
| 13. Distribute fees | `MerchantClient` | `merchant.operator.distributeFees()` (skipped if no fees) |

## Key Implementation Details

- **HTTP 402 flow**: Steps 3-4 use `performHTTP402Payment` which runs the full HTTP 402 protocol: unpaid request returns 402, client creates payment payload, paid request is verified, and settlement executes on-chain.
- **Role-scoped presets**: Uses `createPayerClient()`, `createMerchantClient()`, `createArbiterClient()` from `@x402r/sdk` for type-safe action groups.
- **Hash computation**: `computePaymentInfoHash()` computes the escrow hash off-chain (matches on-chain `getHash`).
- **Freeze is arbiter-only**: `PayerClient` only has `isFrozen` (read-only). `ArbiterClient` has full freeze access (`freeze`, `unfreeze`, `isFrozen`).
- **RPC delay**: A 2-second delay after each transaction allows Base Sepolia RPC state propagation.

## File Structure

```
examples/e2e-test/
  index.ts       # main test orchestration
  runner.ts      # StepRunner class
  accounts.ts    # E2EAccounts, setup, funding
  http402.ts     # HTTP 402 infrastructure and payment flow
  sdk.ts         # SDK instance creation, operator deployment, evidence bytecode
  config.ts      # constants and helpers
  README.md      # this file
  package.json   # dependencies
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRIVATE_KEY` | Yes | -- | Private key of a funded Base Sepolia wallet |
| `RPC_URL` | No | `https://sepolia.base.org` | Base Sepolia RPC endpoint |
| `NETWORK_ID` | No | `eip155:84532` | Network identifier |
