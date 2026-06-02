---
"@x402r/helpers": minor
---

Gate `forwardToArbiter` on the `AUTH_CAPTURE_SCHEME` constant from `@x402r/evm` instead of a hardcoded `'authCapture'` literal, and align `@x402r/helpers` to the renamed auth-capture scheme graph.

**Why:** the scheme literal was renamed `authCapture` → `auth-capture`. The hardcoded gate matched nothing once helpers consumed the renamed scheme, so the merchant→arbiter forwarding would silently early-return on every settlement.

**Breaking (peer requirements):**

- `@x402/core` peer raised `>=2.5.0` → `^2.14.0`.
- `@x402/evm ^2.14.0` and `viem ^2.48.11` added as peers.
- `@x402r/evm` peer floor raised to `>=0.2.0-alpha.1` — the renamed build that exposes `AUTH_CAPTURE_SCHEME = "auth-capture"` and drops the local client subpath (the client is now consumed from `@x402/evm/auth-capture/client`).

`forwardToArbiter` now fires only when `requirements.scheme === AUTH_CAPTURE_SCHEME` (`"auth-capture"`); it no longer matches the legacy `"authCapture"` literal.
