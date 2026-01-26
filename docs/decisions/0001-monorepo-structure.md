# ADR-0001: Monorepo Structure

## Status
Accepted

## Context
We need to organize the X402r SDK codebase in a way that supports multiple packages while maintaining a good developer experience for both contributors and consumers.

## Decision
Use a monorepo structure with Turborepo for build orchestration and pnpm workspaces for package management.

**Structure:**
```
x402r-sdk/
├── packages/
│   ├── core/       # @x402r/core
│   ├── client/     # @x402r/client
│   ├── merchant/   # @x402r/merchant
│   └── arbiter/    # @x402r/arbiter
├── examples/
└── docs/
```

**Packages:**
- `@x402r/core` - Shared types, ABIs, utilities (no dependencies on other packages)
- `@x402r/client` - Client/payer SDK (depends on core)
- `@x402r/merchant` - Server/merchant SDK (depends on core)
- `@x402r/arbiter` - Dispute resolution SDK (depends on core)

## Consequences

**Positive:**
- Single repository for all SDK packages
- Shared configuration and tooling
- Atomic changes across packages
- Efficient caching with Turborepo

**Negative:**
- More complex initial setup
- All packages share the same release cycle

## Alternatives Considered

1. **Separate repositories** - Would complicate cross-package changes and version coordination
2. **Single package** - Would force consumers to install everything even if they only need one persona
