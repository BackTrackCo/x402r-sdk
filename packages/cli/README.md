# @x402r/cli

One-shot CLI for paying x402 / x402r HTTP 402 endpoints. Wallet-agnostic: raw
private key, JSON-RPC signer, or a custom signer module. Zero provider SDK
dependencies.

## Install

Use `npx` — no project install required.

```bash
npx @x402r/cli@0.2.0 pay <url> [options]
```

## Surface

```
x402r pay <url> [signer flags] [--max-amount N] [--rpc <url>] [--chain <eip155:id>] [--json]
```

Exactly one signer source must resolve. CLI flag > env var.

| Source            | Flag                                            | Env                            |
|-------------------|-------------------------------------------------|--------------------------------|
| Raw key           | `--key 0x...`                                   | `PRIVATE_KEY`                  |
| Remote RPC signer | `--signer-url <url> --signer-address 0x...`     | `SIGNER_URL`, `SIGNER_ADDRESS` |
| Custom module     | `--signer-module <pkg-or-path>`                 | `SIGNER_MODULE`                |

Env var names are unprefixed to match the Foundry / Hardhat / x402-reference
convention. The flag form is available when you want to avoid collisions.

## Exit codes

| Code | Meaning |
|------|---------|
| 0    | success |
| 1    | network error |
| 2    | malformed 402 / unusable accepts[] |
| 3    | price exceeds `--max-amount` guard |
| 4    | signature rejected |
| 5    | settlement failed (merchant 4xx/5xx after payment, or facilitator error) |
| 6    | signer resolution failed (none, multiple, or partially-configured sources) |

## `--json` envelope

```json
{
  "body": "<merchant response body>",
  "status": 200,
  "tx": "0x…",
  "elapsedMs": 1234,
  "signer": { "kind": "key", "address": "0x…" }
}
```

`signer` is omitted when the URL returned non-402 (no payment was made).

## Examples

### Raw key

```bash
PRIVATE_KEY=0x... \
  npx @x402r/cli@0.2.0 pay https://example.com/paid
```

### JSON-RPC signer

Anything speaking `eth_signTypedData_v4` works: Privy wallet RPC, Turnkey,
Fireblocks, Safe, a local `cast wallet` endpoint, a hardware wallet exposed
over an RPC bridge, etc.

```bash
npx @x402r/cli@0.2.0 pay https://example.com/paid \
  --signer-url https://signer.example/rpc \
  --signer-address 0x...
```

### Custom module — Privy (`@privy-io/server-auth`)

```js
// privy-signer.js
import { PrivyClient } from '@privy-io/server-auth'
import { createViemAccount } from '@privy-io/server-auth/viem'

export default async function () {
  const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET)
  return createViemAccount({
    walletId: process.env.PRIVY_WALLET_ID,
    address: process.env.PRIVY_WALLET_ADDRESS,
    privy,
  })
}
```

```bash
npx @x402r/cli@0.2.0 pay https://example.com/paid \
  --signer-module ./privy-signer.js
```

### Custom module — Coinbase CDP server wallet

```js
// cdp-signer.js
import { CdpClient } from '@coinbase/cdp-sdk'
import { toAccount } from 'viem/accounts'

export default async function () {
  const cdp = new CdpClient()
  const acct = await cdp.evm.getOrCreateAccount({ name: process.env.CDP_ACCOUNT_NAME })
  return toAccount(acct)
}
```

```bash
npx @x402r/cli@0.2.0 pay https://example.com/paid \
  --signer-module ./cdp-signer.js
```

## Signer module contract

The module's default export is a factory `() => Promise<Account>` that
returns a viem [`Account`](https://viem.sh/docs/accounts/custom). The CLI
only needs `signTypedData` — transaction broadcasting is handled by the
facilitator.

## Notes

- Wallet-agnostic by design: the CLI carries zero Privy / CDP / Turnkey
  dependencies. Provider SDKs are loaded only when `--signer-module` points
  at a user-authored shim.
- Pinned-version invocation (`npx @x402r/cli@0.2.0`) is recommended so agent
  skill wrappers can wildcard-allow exact command shapes.
- Supports Base and Base Sepolia out of the box. Any EVM chain known to
  `viem/chains` works; unknown chain IDs require `--rpc <url>`.

## Provenance

Starting with `0.3.0-alpha.0`, releases of `@x402r/cli` are published with [Sigstore-backed provenance attestations](https://docs.npmjs.com/generating-provenance-statements) via [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/). Earlier versions (`0.2.x` and below) do not carry attestations. Verify a provenance-enabled version after install:

```sh
npm audit signatures @x402r/cli
```

The attestation bundle is also visible in the npm package metadata under `dist.attestations`. See [`SECURITY.md`](../../SECURITY.md) for the full security policy and how to report vulnerabilities.
