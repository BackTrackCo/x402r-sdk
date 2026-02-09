# x402r Hono Server Example

Hono server with a refundable paywall using `@x402/hono` middleware and x402r escrow scheme.

Forked from [`x402/examples/typescript/servers/hono`](https://github.com/coinbase/x402/tree/main/examples/typescript/servers/hono).

## x402 vs x402r

| x402 | x402r |
|---|---|
| `ExactEvmScheme` | `EscrowServerScheme` |
| `{ scheme: "exact", payTo: evmAddress }` | `refundable({ scheme: "escrow", payTo: address }, operatorAddress)` |
| EVM + SVM | EVM-only |

## Setup

1. Copy `.env-local` to `.env` and fill in your values:
   ```bash
   cp .env-local .env
   ```

   - `ADDRESS` - Merchant receive address
   - `OPERATOR_ADDRESS` - Deployed PaymentOperator contract address
   - `FACILITATOR_URL` - Facilitator endpoint (default: `http://localhost:4022`)

2. Start a facilitator: `pnpm example:facilitator`

3. Run the server:
   ```bash
   pnpm example:server:hono
   ```

4. Test:
   ```bash
   curl http://localhost:4021/weather
   ```
