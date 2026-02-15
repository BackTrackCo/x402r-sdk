# @x402r/client

Client SDK for payers using x402r refundable payments. Query payment state, request refunds, and freeze escrows.

## Install

```bash
npm install @x402r/client
```

## Usage

```typescript
import { X402rClient } from "@x402r/client";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const wallet = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account, // your viem account
});

const client = new X402rClient({ walletClient: wallet });

// Query payment state
const state = await client.getPaymentState(paymentId);

// Request a refund
await client.requestRefund(paymentId);
```

## Links

- [Documentation](https://docs.x402r.org)
- [GitHub](https://github.com/x402r/x402r-sdk)

## License

Apache-2.0
