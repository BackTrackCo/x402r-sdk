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

The client organizes operations into action groups by protocol domain:

- **payment** — `authorize`, `charge`, `release`, `refundInEscrow`, `refundPostEscrow`, `approvePostEscrowRefund`, `getPostEscrowRefundAllowance`, `getState`, `getAmounts`
- **refund** — dispute lifecycle: `request`, `cancel`, `deny`, `refuse`, `approveWithSignature`, and read helpers (requires `refundRequestAddress`)
- **evidence** — `submit`, `get`, `getBatch`, `count`
- **escrow** — `isDuringEscrow`, `getAuthorizationTime`, `getDuration` (requires `escrowPeriodAddress`)
- **freeze** — `freeze`, `unfreeze`, `isFrozen` (requires `freezeAddress`)
- **operator** — `getConfig`, `getFeeAddresses`, `calculateFees`, `distributeFees`
- **watch** — `onPayment`, `onRefundRequest`, `onFeeDistribution`

## Extending

`.extend()` adds new namespaces to the client — inspired by viem's extend pattern. The extension function receives the base client and returns an object whose keys become top-level properties, fully typed and chainable.

```ts
import { escrowPeriodActions } from '@x402r/sdk/plugins'

const x402r = createX402r({ publicClient, walletClient, operatorAddress: '0x…' })
  .extend(escrowPeriodActions('0xEscrowPeriod…'))
  .extend((client) => ({
    disputes: {
      async submitEvidence(
        paymentInfo: PaymentInfo,
        nonce: bigint,
        evidence: { name: string; description: string },
        ipfsUpload: (data: string) => Promise<string>,
      ) {
        const cid = await ipfsUpload(JSON.stringify(evidence))
        return client.evidence.submit(paymentInfo, nonce, cid)
      },
      async resolve(paymentInfo: PaymentInfo, nonce: bigint, ruling: 'refund' | 'deny') {
        if (ruling === 'refund') {
          const { refundableAmount } = await client.payment.getAmounts(paymentInfo)
          return client.payment.refundInEscrow(paymentInfo, refundableAmount)
        }
        return client.refund.deny(paymentInfo, nonce)
      },
    },
  }))

await x402r.escrow!.isDuringEscrow(paymentInfo)
await x402r.disputes.submitEvidence(
  paymentInfo, 0n,
  { name: 'Missing delivery', description: '...' },
  pinataUpload,
)
await x402r.disputes.resolve(paymentInfo, 0n, 'refund')
```

Shipped plugins (`escrowPeriodActions`, `freezeActions`) fill optional `escrow`/`freeze` slots. Custom extensions can add any namespace. Extensions cannot override defined base keys.

## Refund & Dispute Flow

Non-obvious behaviors integrators should be aware of:

1. **Evidence is 1:1 with RefundRequest** — each RefundRequest gets its own factory-deployed Evidence contract. Different arbiter = different contracts = separate evidence stores. Evidence is required when refund is configured (`refundRequestEvidenceAddress` must be provided alongside `refundRequestAddress`).

2. **`approve()` is cumulative and immediate** — each call adds to `approvedAmount` and atomically executes `refundInEscrow()`. No undo. Amount is `uint120` (max ~1.3e36).

3. **Evidence access control** — arbiter identity comes from `REFUND_REQUEST.ARBITER()`, not from the operator's condition tree. If arbiter is a multisig, that address must call `submitEvidence()`.

4. **Post-escrow refunds bypass RefundRequest** — receiver can call `refundPostEscrow()` directly via the Receiver singleton condition. No arbiter involvement.

5. **Freeze roles** — payer freezes (time extension near deadline), arbiter unfreezes (investigation resolved).

6. **`payment.refundInEscrow` is gated** — on marketplace operators, only the RefundRequest contract can call it (via `StaticAddressCondition`). Use `refund.approve()` on role clients instead.

## Docs

[docs.x402r.org](https://docs.x402r.org)

## License

[Apache-2.0](../../LICENSE)
