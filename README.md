# X402r SDK

Production-ready TypeScript SDK for the X402r refundable payments protocol.

[![Tests](https://img.shields.io/badge/tests-271%20passing-brightgreen)](https://github.com/BackTrackCo/x402r-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Packages

| Package | Description |
|---------|-------------|
| `@x402r/core` | Shared types, ABIs, deployment helpers, and utilities |
| `@x402r/client` | SDK for payers (payment queries, refund requests, freeze) |
| `@x402r/merchant` | SDK for merchants (release, charge, refund handling) |
| `@x402r/arbiter` | SDK for arbiters (dispute resolution, AI integration) |

> **Note:** Server helpers (`refundable`) are included in `@x402r/helpers`.

## Installation

```bash
# Install all packages
pnpm add @x402r/core @x402r/client @x402r/merchant @x402r/arbiter

# Or install individually
pnpm add @x402r/client  # For payers
pnpm add @x402r/merchant  # For merchants
pnpm add @x402r/arbiter  # For arbiters

# For server route helpers (optional)
pnpm add @x402r/helpers
```

## Quick Start

### Client (Payer)

```typescript
import { X402rClient } from '@x402r/client';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = new X402rClient({
  publicClient: createPublicClient({ chain: baseSepolia, transport: http() }),
  walletClient: createWalletClient({ chain: baseSepolia, transport: http() }),
  operatorAddress: '0x...',
});

// Check payment state
const state = await client.getPaymentState(paymentInfo);

// Request a refund
const { txHash } = await client.requestRefund(paymentInfo);
```

### Merchant

```typescript
import { X402rMerchant } from '@x402r/merchant';

const merchant = new X402rMerchant({
  publicClient,
  walletClient,
  operatorAddress: '0x...',
});

// Release funds from escrow
await merchant.release(paymentInfo, amount);

// Charge (immediate settlement)
await merchant.charge(paymentInfo, amount, tokenCollector, collectorData);

// Refund after release
await merchant.refundPostEscrow(paymentInfo, amount, tokenCollector, collectorData);

// Get operator config
const config = await merchant.getOperatorConfig();
```

### Arbiter

```typescript
import { X402rArbiter, createWebhookHandler } from '@x402r/arbiter';

const arbiter = new X402rArbiter({
  publicClient,
  walletClient,
  operatorAddress: '0x...',
});

// Approve or deny refunds
await arbiter.approveRefund(paymentInfo);
await arbiter.denyRefund(paymentInfo);

// AI-powered dispute resolution
const handler = createWebhookHandler({
  arbiter,
  evaluationHook: async (context) => ({
    decision: context.paymentInfo.maxAmount < 5000000n ? 'approve' : 'deny',
    reasoning: 'Auto-approved small amount',
  }),
  autoExecute: true,
});
```

### Server Helpers

```typescript
import { refundable } from '@x402r/helpers';

// Define routes with refundable payment options
const routes = {
  '/api/resource': {
    accepts: [
      refundable({
        scheme: 'escrow',
        payTo: '0xMerchantAddress...',
        price: '$0.01',
        network: 'eip155:84532',
      }, '0xOperatorAddress...'),
    ],
  },
};
```

## Documentation

- [Operator Deployment Guide](./docs/OPERATOR_DEPLOYMENT_GUIDE.md) - Deploy payment operators
- [SDK Documentation](https://docs.x402r.org/sdk/overview) - Guides and tutorials
- [API Reference](https://backtrackco.github.io/x402r-sdk) - Auto-generated TypeDoc

## Deploying Operators

Deploy a complete marketplace operator with escrow, freeze, and arbiter support:

```typescript
import { deployMarketplaceOperator } from '@x402r/core';

const result = await deployMarketplaceOperator(
  walletClient,
  publicClient,
  'eip155:84532', // Base Sepolia
  {
    feeRecipient: '0x...',
    arbiter: '0x...',
    escrowPeriodSeconds: 604800n, // 7 days
    operatorFeeBps: 100n, // 1%
  }
);

console.log('Operator deployed at:', result.operatorAddress);
```

See `examples/deploy-operator/` for a complete example.

## Network Support

| Network | Chain ID | Status |
|---------|----------|--------|
| Base Sepolia | 84532 | ✅ Supported |
| Base Mainnet | 8453 | ✅ Supported |

## Subgraph Dependency

Some query methods require a subgraph/indexer and will throw `NotImplementedError` until deployed:

| Package | Method |
|---------|--------|
| `@x402r/client` | `getPaymentState()`, `paymentExists()`, `isInEscrow()`, `getPaymentDetails()`, `getMyPayments()` |
| `@x402r/merchant` | `getPaymentState()`, `getReceiverPayments()` |
| `@x402r/arbiter` | `getPaymentState()` |

All write operations (refunds, releases, charges) work directly on-chain without the subgraph.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Generate API docs
pnpm docs:generate
```

## License

MIT
