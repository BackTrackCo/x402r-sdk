# E2E Dispute Resolution Example

End-to-end script demonstrating the full x402r dispute resolution flow:

1. **Setup** — Deploy operator with short escrow (60s) + freeze (120s)
2. **Arbiter Registry** — Register arbiter
3. **Payment** — Client pays merchant via HTTP 402 flow
4. **Dispute** — Client freezes payment and requests refund
5. **Resolution** — Arbiter approves and executes refund
6. **Cleanup** — Deregister arbiter, print summary

## Prerequisites

- Node.js 20+
- 3 wallets funded with Base Sepolia ETH (for gas) and USDC (for payments)
- Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Get testnet USDC: mint at `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Setup

```bash
cp .env.example .env
# Edit .env with your 3 private keys
```

## Run

```bash
pnpm start
```

## Expected Output

The script runs through all 5 phases and prints a summary with transaction hashes for each step. The client's USDC balance should be restored after the refund executes.

## Key Parameters

| Parameter | Value | Note |
|-----------|-------|------|
| Escrow period | 60 seconds | Short for testing |
| Freeze duration | 120 seconds | Short for testing |
| Operator fee | 1% (100 bps) | Standard marketplace fee |
| Payment amount | 0.01 USDC (10000 units) | Minimal test amount |
