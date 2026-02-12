# x402r-sdk

Production TypeScript SDK for the x402r refundable payments protocol.

## Commands

```bash
pnpm install
pnpm build              # Build all packages (Turborepo)
pnpm test               # Run all tests (311 vitest tests across 26 files, 5 packages)
pnpm test:coverage      # Run with coverage
pnpm typecheck          # Type check all packages
pnpm lint               # Lint code
pnpm docs:generate      # Generate TypeDoc API reference → docs-generated/
pnpm example:e2e-test   # E2E integration test on Base Sepolia (needs PRIVATE_KEY)
```

## Package Structure

```
@x402r/core      → Types, ABIs, config, errors, factory utilities, condition builder
@x402r/client    → X402rClient: payer operations (queries, refunds, freezing)
@x402r/merchant  → X402rMerchant: merchant operations (release, charge, refund handling)
@x402r/arbiter   → X402rArbiter: dispute resolution, AI integration
@x402r/helpers   → x402-specific route helpers (Express, Hono)
```

All packages live in `packages/` and are built via Turborepo.

## Contract Address Source of Truth

`packages/core/src/config/index.ts` — canonical contract addresses for Base Sepolia and Base Mainnet. All other repos should reference this file.

## Key Files

| Path | Purpose |
|------|---------|
| `packages/core/src/config/index.ts` | Contract addresses and chain config |
| `packages/core/src/abis/` | Contract ABIs |
| `packages/core/src/types/` | Shared types |
| `docs/` | Deployment guides and examples |
| `docs-generated/` | TypeDoc API reference (generated, gitignored) |
| `examples/` | Usage examples |

## Testing

Tests use Vitest. Each package has its own test suite under `packages/<name>/tests/`.

```bash
# Run specific package tests
pnpm --filter @x402r/core test
pnpm --filter @x402r/client test
pnpm --filter @x402r/merchant test
pnpm --filter @x402r/arbiter test
pnpm --filter @x402r/helpers test
```

## Examples

| Example | Script | Description |
|---------|--------|-------------|
| `deploy-operator` | `pnpm example:deploy-operator` | Deploy a marketplace operator |
| `e2e-test` | `PRIVATE_KEY=0x... pnpm example:e2e-test` | Full payment lifecycle on Base Sepolia |
| `client-cli` | `pnpm example:client-cli` | Client SDK usage patterns |
| `arbiter-cli` | `pnpm example:arbiter-cli` | Arbiter SDK usage patterns |

## E2E Test Key Learnings

Important patterns discovered during E2E testing on Base Sepolia:

- **ERC-3009 (not ERC-20 approve)**: The escrow authorize flow uses `ReceiveWithAuthorization` signatures. The `collectorData` param must contain the raw ERC-3009 signature, not an ERC-20 approval.
- **feeReceiver = operator address**: `PaymentInfo.feeReceiver` must be the deployed operator contract address. The contract enforces this via `validFees` modifier — fails with `InvalidFeeReceiver()`.
- **preApprovalExpiry = ERC-3009 validBefore**: This field doubles as the `validBefore` timestamp for ERC-3009 signing. Setting it to `0n` causes immediate signature expiry.
- **RPC state propagation**: Base Sepolia public RPCs may return stale state right after tx confirmation. Add a small delay (~2s) when reading state after writes.

## Design Decisions

See `x402r-notes/sdk/` for implementation plans and design decision records:

- `SDK_IMPLEMENTATION_PLAN.md` — Overall SDK roadmap and phases
- `DESIGN_DECISIONS.md` — Key architectural decisions
- `SDK_TECHNICAL_DEBT.md` — Known issues, technical debt & TODO items

## Coding Conventions

- TypeScript strict mode
- Use `viem` for blockchain interactions (never ethers.js)
- Contract addresses as `Address` type with `as const`
- All packages prefixed with `@x402r/`
