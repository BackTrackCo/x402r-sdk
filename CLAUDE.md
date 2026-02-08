# x402r-sdk

Production TypeScript SDK for the x402r refundable payments protocol.

## Commands

```bash
pnpm install
pnpm build              # Build all packages (Turborepo)
pnpm test               # Run all tests (271+ vitest tests across 5 packages)
pnpm test:coverage      # Run with coverage
pnpm typecheck          # Type check all packages
pnpm lint               # Lint code
pnpm docs:generate      # Generate TypeDoc API reference → docs-generated/
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

## Design Decisions

See `x402r-notes/sdk/` for implementation plans and design decision records:

- `SDK_IMPLEMENTATION_PLAN.md` — Overall SDK roadmap and phases
- `DESIGN_DECISIONS.md` — Key architectural decisions
- `PHASE_1_2_HACKS_AND_ASSUMPTIONS.md` — Known hacks, assumptions & technical debt

## Coding Conventions

- TypeScript strict mode
- Use `viem` for blockchain interactions (never ethers.js)
- Contract addresses as `Address` type with `as const`
- All packages prefixed with `@x402r/`
