# Contributing

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) 10.23
- [Foundry](https://getfoundry.sh/) (for fork tests)

## Setup

```bash
git clone https://github.com/BackTrackCo/x402r-sdk.git
cd x402r-sdk
pnpm install
pnpm build
git config core.hooksPath .githooks   # enables pre-commit (runs check + build + typecheck)
```

## Commands

| Command | Description |
| --- | --- |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests |
| `pnpm test:fork` | Run fork tests (requires Foundry) |
| `pnpm typecheck` | Type-check all packages |
| `pnpm check` | Biome lint + format check |
| `pnpm format` | Auto-fix lint + format |

## Code style

- TypeScript strict mode, `viem` for all chain interactions (never ethers.js)
- Biome handles lint and formatting (no eslint/prettier)
- Single quotes, no semicolons

## Branching

Branch from `main` using `<username>/<feature-description>` (kebab-case).
