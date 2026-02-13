# X402r SDK

TypeScript SDK for the X402r refundable payments protocol.

> **⚠️ UNDER DEVELOPMENT - NOT PRODUCTION READY**
>
> This SDK is in active development and may have breaking changes, bugs, or incomplete features.
> Use for testing and experimentation only. Packages are not yet published to npm.

## Packages

| Package           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `@x402r/core`     | Shared types, ABIs, deployment helpers, and utilities     |
| `@x402r/client`   | SDK for payers (payment queries, refund requests, freeze) |
| `@x402r/merchant` | SDK for merchants (release, charge, refund handling)      |
| `@x402r/arbiter`  | SDK for arbiters (dispute resolution, AI integration)     |
| `@x402r/helpers`  | Server helpers for building payment requirements          |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check all packages
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Format code
pnpm format

# Clean build artifacts
pnpm clean

# Generate API docs
pnpm docs:generate
pnpm docs:watch
```

## Running Examples

The SDK includes working examples for a complete payment flow:

```bash
# 1. Deploy an operator (one-time setup)
PRIVATE_KEY=0x... pnpm example:deploy-operator

# 2. Start the facilitator service
cd examples/facilitator && cp .env.example .env  # Configure with PRIVATE_KEY + OPERATOR_ADDRESS
pnpm dev

# 3. Start the merchant server (in a new terminal)
cd examples/merchant-server && cp .env.example .env  # Configure with PRIVATE_KEY, OPERATOR_ADDRESS, FACILITATOR_URL
pnpm example:merchant-server

# 4. Make a payment with the client CLI (in a new terminal)
cd examples/client-cli && cp .env.example .env  # Configure first
pnpm example:client-cli pay --url http://localhost:3000/weather
```

The flow is: Client -> Merchant Server -> Facilitator -> Blockchain. The merchant server uses x402's standard `paymentMiddleware` and delegates verify/settle to the facilitator service.

See the [Examples Guide](./docs/EXAMPLES_GUIDE.md) for the complete walkthrough including freeze and refund operations.

### Pre-deployed Test Operator (Base Sepolia)

Use this operator for testing:

| Contract        | Address                                      |
| --------------- | -------------------------------------------- |
| PaymentOperator | `0xbb4f390b80E4F4895B96B95AE382B65fDC45974B` |
| Freeze          | `0xD0f99B7667076f151FD8240b277f1765d147e48C` |
| EscrowPeriod    | `0xFcFb7e197823D304D53F47BE1E9761e9D102589b` |

## Documentation

- [Examples Guide](./docs/EXAMPLES_GUIDE.md) - Merchant server and client CLI walkthrough
- [Operator Deployment Guide](./docs/OPERATOR_DEPLOYMENT_GUIDE.md) - Deploy payment operators
- [API Reference](https://backtrackco.github.io/x402r-sdk) - Auto-generated TypeDoc

## Network Support

| Network      | Chain ID | Status       |
| ------------ | -------- | ------------ |
| Base Sepolia | 84532    | ✅ Supported |
| Base Mainnet | 8453     | 🚧 Pending   |

## Known Limitations

- `client.getPaymentDetails()` throws `NotImplementedError` — cannot reverse a hash to PaymentInfo without a subgraph. Store PaymentInfo locally when creating payments.
- All other query methods (`getPaymentState()`, `paymentExists()`, `isInEscrow()`, `getPayerPayments()`, `getReceiverPayments()`, `getPaymentAmounts()`) read directly from on-chain contracts.
- All write operations (refunds, releases, charges) work directly on-chain.

## License

Apache-2.0
