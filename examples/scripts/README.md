# examples/scripts/

Infrastructure scripts that orchestrate scenarios, not role-based examples. Role-based examples (payer/, merchant/, arbiter/) demonstrate SDK usage; scripts here exist to support running the role-based examples or scenarios in specific configurations (e.g., CI).

## scenarios-ci.ts

Starts ONE prool server and runs each scenario as a subprocess with a unique numeric prool key. Mirrors the fork-test pattern at `packages/core/tests/setup/anvil.ts:43`. Used by the root `scenarios:ci` script invoked from CI.
