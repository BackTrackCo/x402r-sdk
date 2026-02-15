# @x402r/core

Core types, ABIs, and utilities for the x402r refundable payments protocol.

## Install

```bash
npm install @x402r/core
```

## Usage

```typescript
import { getContractAddresses, PaymentState } from "@x402r/core";

// Get contract addresses for Base Sepolia
const addresses = getContractAddresses(84532);

// Use payment state enum
if (state === PaymentState.Authorized) {
  // payment is authorized and held in escrow
}
```

## Exports

- **Types** — `PaymentInfo`, `PaymentState`, `RefundRequestData`, and more
- **ABIs** — Contract ABIs for AuthCaptureEscrow, PaymentOperator, USDC
- **Config** — Contract addresses and chain configuration
- **Errors** — Typed error classes for SDK operations
- **Factory** — Utilities for deploying and configuring operators
- **Conditions** — Condition builder for escrow terms
- **Fees** — Fee calculation utilities

## Links

- [Documentation](https://docs.x402r.org)
- [GitHub](https://github.com/x402r/x402r-sdk)

## License

Apache-2.0
