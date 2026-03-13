# Dev Tools

Internal CLI tools for testing and interacting with x402r protocol contracts.

These are **not** examples of how to integrate x402r — see the parent `examples/` directory for integration examples.

## Tools

| Tool | Description | Command |
|------|-------------|---------|
| `client-cli/` | Payer operations: pay, freeze, refund | `pnpm example:client-cli` |
| `merchant-cli/` | Merchant operations: release, approve/deny refunds | `pnpm example:merchant-cli` |
| `arbiter-cli/` | Arbiter operations: review/decide refund requests | `pnpm example:arbiter-cli` |
| `shared/` | Shared utilities, CLI setup, and payment state management | - |

## Setup

Each CLI reads from its own `.env` file. Copy `.env.example` to `.env` and fill in your values:

```bash
PRIVATE_KEY=0x...
OPERATOR_ADDRESS=0x...
```
