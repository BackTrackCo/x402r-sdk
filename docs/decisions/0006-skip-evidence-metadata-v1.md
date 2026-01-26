# ADR-0006: Skip Evidence/Metadata System for v1

## Status
Accepted

## Context
Dispute resolution often requires:
- Evidence submission (screenshots, logs, communications)
- Metadata storage (reason codes, notes)
- Communication channels between parties

Potential storage options:
- IPFS for decentralized storage
- XMTP for encrypted messaging
- Traditional databases for centralized solutions

## Decision
Skip the evidence/metadata system in v1. Design for future pluggable communication channels.

**v1 scope:**
- RefundRequest events contain only on-chain data
- No SDK-level evidence submission
- Arbiters use external tools for evidence gathering

**v2 design considerations:**
- Pluggable storage adapters (IPFS, Arweave, centralized)
- Pluggable messaging adapters (XMTP, Matrix, custom)
- Evidence hashing for on-chain verification
- Encrypted evidence for privacy

## Consequences

**Positive:**
- Simpler v1 release
- No dependency on external storage systems
- Flexibility to design proper system based on real usage

**Negative:**
- Arbiters need external tooling for evidence
- No standardized evidence format initially

## Alternatives Considered

1. **IPFS-only evidence** - Would force specific storage choice
2. **XMTP messaging** - Would add significant complexity
3. **On-chain metadata** - Expensive and limited

## Future Work
- v2: Design pluggable evidence system
- v2: Add IPFS adapter
- v2: Add XMTP adapter
- v2: Define evidence schema standard
