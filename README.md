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

The SDK includes working examples for a complete payment flow. All commands run from the SDK root.

```bash
# 1. Deploy an operator (one-time setup — or use the pre-deployed one below)
PRIVATE_KEY=0x... pnpm example:deploy-operator

# 2. Start the facilitator (new terminal)
# Configure examples/facilitator/basic/.env first (copy from .env-local)
pnpm example:facilitator

# 3. Start the merchant server (new terminal)
# Configure examples/servers/express/.env first (copy from .env-local)
pnpm example:server:express

# 4. Make a payment (new terminal)
# Configure examples/dev-tools/client-cli/.env first (copy from .env.example)
pnpm example:client-cli pay --url http://localhost:4021/weather
```

The flow is: Client -> Merchant Server -> Facilitator -> Blockchain. The merchant server uses x402's standard `paymentMiddleware` and delegates verify/settle to the facilitator service.

See the [Examples Guide](./docs/EXAMPLES_GUIDE.md) for the complete walkthrough including freeze, refund, and arbiter operations.

### Pre-deployed Test Operator (Base Sepolia)

Short-escrow operator for testing (5min escrow, 3min freeze window, 1% fee):

| Contract        | Address                                      |
| --------------- | -------------------------------------------- |
| PaymentOperator | `0x8140b98ec518843EA1Dd40C42617ACBa71752C33` |
| EscrowPeriod    | `0x0402f5b49126786c01c3e0885767bB11C0199372` |
| Freeze          | `0x6d64A0B25A1494f347941614fc8799B486a603A6` |

## Documentation

- [Examples Guide](./docs/EXAMPLES_GUIDE.md) - Merchant server and client CLI walkthrough
- [Operator Deployment Guide](./docs/OPERATOR_DEPLOYMENT_GUIDE.md) - Deploy payment operators
- [API Reference](https://backtrackco.github.io/x402r-sdk) - Auto-generated TypeDoc

## Network Support

| Network | Chain ID | Status |
| ------- | -------- | ------ |
| Base Sepolia | 84532 | ✅ Tested |
| Base Mainnet | 8453 | 🚧 Deployed, not yet tested |
| Ethereum, Ethereum Sepolia, Polygon, Arbitrum, Optimism, Avalanche, Celo, Monad | various | 🚧 Deployed, not yet tested |

Contracts are deployed to 10 networks. Addresses: `packages/core/src/config/index.ts`.

## Known Limitations

- All query methods (`getPaymentDetails()`, `getPaymentState()`, `paymentExists()`, `isInEscrow()`, `getPayerPayments()`, `getReceiverPayments()`, `getPaymentAmounts()`) read directly from on-chain contracts.
- All write operations (refunds, releases, charges) work directly on-chain.

## License

Apache-2.0
