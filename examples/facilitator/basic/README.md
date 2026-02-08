# x402r Facilitator — Basic Example

Forked from [`x402/examples/typescript/facilitator/basic`](https://github.com/coinbase/x402/tree/main/examples/typescript/facilitator/basic).

## x402 vs x402r

| x402 (source) | x402r (this example) |
|---|---|
| `registerExactEvmScheme(facilitator, { signer, networks })` | `registerEscrowScheme(facilitator, { signer, networks, operatorAddress, escrowAddress, tokenCollector })` |
| `import from "@x402/evm/exact/facilitator"` | `import from "@x402r/evm/escrow/facilitator"` |
| `EVM_PRIVATE_KEY` + `SVM_PRIVATE_KEY` env vars | `PRIVATE_KEY` + `OPERATOR_ADDRESS` env vars |
| EVM + SVM support | EVM-only |

## Setup

1. Deploy an operator:
   ```bash
   PRIVATE_KEY=0x... pnpm example:deploy-operator
   ```

2. Copy `.env-local` to `.env` and fill in your values:
   ```bash
   cp .env-local .env
   ```

3. Run the facilitator:
   ```bash
   pnpm example:facilitator
   ```

4. Test:
   ```bash
   curl http://localhost:4022/supported
   ```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/supported` | Supported schemes with escrow metadata |
| POST | `/verify` | Verify escrow payment signature |
| POST | `/settle` | Settle payment on-chain (calls `authorize()`) |
