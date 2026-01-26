# X402r SDK

Production-ready TypeScript SDK for the X402r refundable payments protocol.

[![Tests](https://img.shields.io/badge/tests-238%20passing-brightgreen)](https://github.com/BackTrackCo/x402r-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Packages

| Package | Description |
|---------|-------------|
| `@x402r/core` | Shared types, ABIs, and utilities |
| `@x402r/client` | SDK for payers (payment queries, refund requests, escrow) |
| `@x402r/merchant` | SDK for merchants (release, refund handling, server helpers) |
| `@x402r/arbiter` | SDK for arbiters (dispute resolution, AI integration) |

## Installation

```bash
# Install all packages
pnpm add @x402r/core @x402r/client @x402r/merchant @x402r/arbiter

# Or install individually
pnpm add @x402r/client  # For payers
pnpm add @x402r/merchant  # For merchants
pnpm add @x402r/arbiter  # For arbiters
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
import { X402rMerchant, refundable, withRefund } from '@x402r/merchant';

const merchant = new X402rMerchant({
  publicClient,
  walletClient,
  operatorAddress: '0x...',
});

// Release funds from escrow
await merchant.release(paymentInfo, amount);

// Server helper: make routes refundable
const routes = withRefund({
  '/api/data': { price: '$0.01', network: 'base-sepolia' }
});
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

## Documentation

- [SDK Documentation](https://docs.x402r.org/sdk/overview) - Guides and tutorials
- [API Reference](https://backtrackco.github.io/x402r-sdk) - Auto-generated TypeDoc

## Network Support

| Network | Chain ID | Status |
|---------|----------|--------|
| Base Sepolia | 84532 | Supported |
| Base Mainnet | 8453 | Coming Soon |

## Known Limitations (v1)

The following features are **not included** in v1 and are planned for future releases:

| Feature | Description | Planned |
|---------|-------------|---------|
| `charge()` | Immediate settlement (authorize + release in one call) | v1.1 |
| `refundPostEscrow()` | Refunds after funds are released | v1.1 |
| Fee management | Fee tracking and multi-token fee utilities | v1.1 |
| Evidence system | Sending evidence/metadata with refund requests | v2.0 |
| Communication | Encrypted messaging between merchant/client (XMTP, IPFS) | v2.0 |

For detailed rationale, see the [Architecture Decision Records](docs/decisions/).

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
