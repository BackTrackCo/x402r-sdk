# @x402r/sdk

Client SDK for x402r refundable payments. Wraps `@x402r/core` with a viem-style client.

## Install

```bash
pnpm add @x402r/sdk
```

## Usage

### Generic client

```ts
import { createX402r } from '@x402r/sdk'

const x402r = createX402r({
  publicClient,
  walletClient,
  operatorAddress: '0x…',
})

const amounts = await x402r.payment.getAmounts(paymentInfo)
const txHash = await x402r.refund.request(paymentInfo, amount, nonce)
```

### Role preset

```ts
import { createPayerClient } from '@x402r/sdk'

const payer = createPayerClient({ publicClient, walletClient, operatorAddress: '0x…' })
// payer.payment only exposes getState and getAmounts — narrowed at the type level
```

Role presets (`createPayerClient`, `createMerchantClient`, `createArbiterClient`) provide type narrowing only. Permissions are enforced on-chain via `canExecute()`.

## Action groups

- **payment** — `authorize`, `charge`, `release`, `getState`, `getAmounts`
- **refund** — `request`, `cancel`, `deny`, `refuse`, `approveWithSignature`, `approveBudget`, `refundInEscrow`, `refundPostEscrow`, and read helpers
- **evidence** — `submit`, `get`, `getBatch`, `count`
- **escrow** — `isDuringEscrow`, `getAuthorizationTime`, `getDuration` (requires `escrowPeriodAddress`)
- **freeze** — `freeze`, `unfreeze`, `isFrozen` (requires `freezeAddress`)
- **operator** — `getConfig`, `getFeeAddresses`, `calculateFees`, `distributeFees`
- **watch** — `onPayment`, `onRefundRequest`, `onFeeDistribution`

## Extending

```ts
const extended = x402r.extend((base) => ({
  myCustomAction: () => base.payment.getAmounts(paymentInfo),
}))

await extended.myCustomAction()
```

Extensions cannot override defined base keys. They can fill `undefined` slots (e.g., providing `escrow` when no address was configured).

## Docs

[docs.x402r.org](https://docs.x402r.org)

## License

[Apache-2.0](../../LICENSE)
