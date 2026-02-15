# @x402r/arbiter

Arbiter SDK for dispute resolution in x402r refundable payments. Resolve disputes, integrate AI decision-making, and manage batch operations.

## Install

```bash
npm install @x402r/arbiter
```

## Usage

```typescript
import { X402rArbiter, createWebhookHandler } from "@x402r/arbiter";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const wallet = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account, // your viem account
});

const arbiter = new X402rArbiter({ walletClient: wallet });

// Resolve a dispute
await arbiter.resolveDispute(paymentId, decision);

// Create an AI-powered webhook handler
const handler = createWebhookHandler({
  arbiter,
  evaluateCase: async (context) => {
    // your AI evaluation logic
    return { approved: true, reason: "Valid refund request" };
  },
});
```

## Links

- [Documentation](https://docs.x402r.org)
- [GitHub](https://github.com/x402r/x402r-sdk)

## License

Apache-2.0
