# x402r Facilitator — Basic Example

Express.js facilitator service that verifies and settles escrow payments on-chain for the x402r protocol.

Forked from [`x402/examples/typescript/facilitator/basic`](https://github.com/coinbase/x402/tree/main/examples/typescript/facilitator/basic).

## x402 vs x402r

| x402 | x402r |
|---|---|
| `registerExactEvmScheme` | `registerEscrowScheme` |
| `import from "@x402/evm/exact/facilitator"` | `import from "@x402r/evm/escrow/facilitator"` |
| EVM + SVM support | EVM-only |

The facilitator is operator-agnostic — it only needs a signer and network. Operator config is provided per-request by the merchant via `refundable()`.

## Setup

1. Copy `.env-local` to `.env` and fill in your private key:
   ```bash
   cp .env-local .env
   ```

2. Run the facilitator:
   ```bash
   pnpm example:facilitator
   ```

3. Test:
   ```bash
   curl http://localhost:4022/supported
   ```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/supported` | Supported schemes and signers |
| POST | `/verify` | Verify escrow payment signature |
| POST | `/settle` | Settle payment on-chain (calls `authorize()`) |
