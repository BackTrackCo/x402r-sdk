# @x402r/merchant

Merchant SDK for servers using x402r refundable payments. Release payments, handle charges, and process refunds on-chain.

## Install

```bash
npm install @x402r/merchant
```

## Usage

```typescript
import { X402rMerchant } from "@x402r/merchant";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const wallet = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account, // your viem account
});

const merchant = new X402rMerchant({ walletClient: wallet });

// Release an authorized payment
await merchant.releasePayment(paymentId);

// Issue a refund
await merchant.refundPayment(paymentId);
```

## Links

- [Documentation](https://docs.x402r.org)
- [GitHub](https://github.com/x402r/x402r-sdk)

## License

Apache-2.0
