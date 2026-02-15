# @x402r/helpers

Server-side helpers for x402r refundable payments. Drop-in route helpers for Express, Hono, and other frameworks.

## Install

```bash
npm install @x402r/helpers
```

## Usage

```typescript
import { refundable } from "@x402r/helpers";

// Express example — protect a route with refundable payments
app.get(
  "/api/weather",
  refundable("$0.01", {
    operatorAddress: "0x...",
    refundExpirySeconds: 3600,
  }),
  (req, res) => {
    res.json({ weather: "sunny" });
  },
);
```

## Links

- [Documentation](https://docs.x402r.org)
- [GitHub](https://github.com/x402r/x402r-sdk)

## License

Apache-2.0
