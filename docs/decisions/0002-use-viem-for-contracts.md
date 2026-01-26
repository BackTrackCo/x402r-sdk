# ADR-0002: Use viem for Contract Interactions

## Status
Accepted

## Context
We need a library for interacting with Ethereum smart contracts. The main options are ethers.js and viem.

## Decision
Use viem as the contract interaction library.

**Reasons:**
- Modern TypeScript-first design with better type inference
- Smaller bundle size
- Better tree-shaking support
- Growing adoption in the ecosystem
- More predictable API with explicit configuration
- Better error messages

## Consequences

**Positive:**
- Strong type safety for contract interactions
- Smaller final bundle size for consumers
- Consistent with modern web3 development practices

**Negative:**
- Some developers may be more familiar with ethers.js
- Fewer tutorials and Stack Overflow answers (but improving)

## Alternatives Considered

1. **ethers.js** - More established but larger bundle, less TypeScript-native
2. **web3.js** - Older API, less TypeScript support
