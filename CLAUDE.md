# x402r-sdk

## Worktrees

- Never modify the primary `x402r-sdk/` checkout. Create a per-task worktree `x402r-sdk-<descriptor>/` off `main`. Other agents work in parallel; touching the primary checkout clobbers them.

## Conventions

- Contract-address source of truth: `packages/core/src/config/index.ts` — never hardcode addresses elsewhere.

## Changesets

- Add a changeset only when the change ships to npm consumers (`packages/**` source or behavior). Skip docs, CI, chore, tests, and internal-only refactors — CI does not enforce one, so don't add one by reflex.
- Body = what changed + the one consumer action, in 1–2 sentences. Rationale, mechanics, and derivation go in the PR body, never the changelog entry (it's published verbatim to npm).
