---
"@x402r/helpers": minor
---

`x402rDefaults` now emits relative deadline offsets (`captureDeadlineSeconds` / `refundDeadlineSeconds`, defaults 86400 / 604800) instead of absolute deadlines computed at call time; the auth-capture server scheme resolves each to an absolute deadline per request. Pass absolute `captureDeadline` / `refundDeadline` to fix either window — each deadline is resolved independently.
