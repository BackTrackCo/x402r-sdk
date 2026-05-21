# Security Policy

This policy covers the code in this repository and the `@x402r/*` packages it publishes to npm. Smart contract source lives in [`x402r-contracts`](https://github.com/BackTrackCo/x402r-contracts) and has its own security surface.

## Supported Versions

`@x402r/{core,sdk,helpers,cli}` are pre-1.0. Security fixes target the current `0.x` minor; older minors may not receive backports. We're a small team — please upgrade to the latest minor before reporting a vulnerability so we can confirm it still reproduces against supported code.

| Version | Supported          |
| ------- | ------------------ |
| Latest `0.x` minor | Yes |
| Older `0.x` minors | Best-effort only |

## Reporting a Vulnerability

**Please do not file a public GitHub issue for security bugs.**

Preferred channel — private GitHub Security Advisory:

  https://github.com/BackTrackCo/x402r-sdk/security/advisories/new

This routes directly to maintainers and lets us collaborate on a fix with you in private before disclosure.

Fallback channel — if the advisory form is unavailable, contact a maintainer directly. Maintainer email addresses are on the public GitHub profiles for [@vraspar](https://github.com/vraspar) and [@A1igator](https://github.com/A1igator).

A useful report includes:

- A description of the vulnerability
- Suggested impact (Critical / High / Medium / Low)
- A minimal reproducible example, or at least the affected file/function and conditions to trigger
- Affected package(s) and version(s)

## What to Expect

- **Acknowledgement**: within 72 hours of receipt (often sooner)
- **Triage**: an initial assessment shared with you within ~1 week
- **Fix and release**: cadence depends on severity. Critical issues get prioritized over feature work
- **Disclosure**: coordinated with the reporter. We'll credit you in the advisory unless you'd rather stay anonymous

Soft commitments only — we'll do our best, but we don't have a 24/7 on-call rotation.

## Scope

**In scope:**

- Source code in this repository
- The published `@x402r/core`, `@x402r/sdk`, `@x402r/helpers`, and `@x402r/cli` npm packages

**Out of scope:**

- Vulnerabilities in upstream dependencies — please report those to the upstream maintainers. If a dependency vulnerability has a non-obvious impact on our packages, we still want to hear about it
- Smart contract vulnerabilities — these belong to [`x402r-contracts`](https://github.com/BackTrackCo/x402r-contracts) and any deployed addresses referenced in `@x402r/core/config`
- Third-party integrations (facilitators, arbiters, wallet providers) that consume our SDK but live in their own repos
- Issues that require an attacker to already control the user's machine, npm registry account, or private keys

## Verifying Package Provenance

Starting with `0.3.0-alpha.0`, the `@x402r/*` packages are published with [Sigstore-backed provenance attestations](https://docs.npmjs.com/generating-provenance-statements) via [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/). Earlier versions (`0.2.x` and below) predate this pipeline and do not carry attestations. After installing a provenance-enabled version, confirm the artifact came from this repository's release workflow:

```sh
npm audit signatures @x402r/core
npm audit signatures @x402r/sdk
npm audit signatures @x402r/helpers
npm audit signatures @x402r/cli
```

The attestation bundle is also visible in the npm package metadata under `dist.attestations`. A provenance mismatch is itself a security finding — please report it through the channels above.
