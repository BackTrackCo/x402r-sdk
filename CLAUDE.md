# x402r-sdk

## Package Structure

```
@x402r/core      → Types, ABIs, config, errors, factory utilities, condition builder
@x402r/client    → Payer operations (queries, refunds, freezing)
@x402r/merchant  → Merchant operations (release, charge, refund handling)
@x402r/arbiter   → Dispute resolution, AI integration
@x402r/helpers   → Route helpers (Express, Hono)
```

## E2E Learnings (Base Sepolia)

- Escrow uses ERC-3009 `ReceiveWithAuthorization` signatures, not ERC-20 approve — `collectorData` must contain the raw ERC-3009 signature
- `PaymentInfo.feeReceiver` must be the operator contract address (enforced by `validFees` modifier)
- `preApprovalExpiry` doubles as ERC-3009 `validBefore` — setting to `0n` causes immediate expiry
- Base Sepolia public RPCs may return stale state after tx — add ~2s delay when reading after writes

## Design Docs

- `x402r-notes/sdk/DESIGN_DECISIONS.md` — architectural decisions
- `x402r-notes/sdk/SDK_TECHNICAL_DEBT.md` — known issues and debt
