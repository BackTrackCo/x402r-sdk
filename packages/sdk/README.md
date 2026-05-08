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
const txHash = await x402r.refund.request(paymentInfo, amount)
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

- **payment** — `authorize`, `charge`, `capture`, `voidPayment`, `refund`, `approveRefundAllowance`, `getRefundAllowance`, `getState`, `getAmounts`
- **refund** — dispute lifecycle: `request`, `cancel`, `deny`, `refuse`, and read helpers (requires `refundRequestAddress`)
- **evidence** — `submit`, `get`, `getBatch`, `count`
- **escrow** — `isDuringEscrow`, `getAuthorizationTime`, `getDuration` (requires `escrowPeriodAddress`)
- **freeze** — `freeze`, `unfreeze`, `isFrozen` (requires `freezeAddress`)
- **operator** — `getConfig`, `getFeeAddresses`, `calculateFees`, `distributeFees`
- **watch** — `onPayment`, `onRefundRequest`, `onRefundExecuted`, `onFeeDistribution`

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
      async resolve(
        paymentInfo: PaymentInfo,
        nonce: bigint,
        ruling: 'refund' | 'partial-refund' | 'deny',
        refundAmount?: bigint,
      ) {
        if (ruling === 'refund') {
          // voidPayment is full-only — empties the entire authorization.
          // The RefundRequest hook (wired as voidPostActionHook) auto-approves
          // any pending payer request as part of the same transaction.
          return client.payment.voidPayment(paymentInfo)
        }
        if (ruling === 'partial-refund' && refundAmount !== undefined) {
          // Partial in-escrow refund via partial capture: capture only what
          // the merchant keeps, then void the remainder back to the payer.
          // Two calls, no allowance, no ReceiverRefundCollector — capture is
          // incremental (decrements escrow.capturableAmount) and void zeros
          // whatever's left.
          const { capturableAmount } = await client.payment.getAmounts(paymentInfo)
          await client.payment.capture(paymentInfo, capturableAmount - refundAmount, '0x')
          return client.payment.voidPayment(paymentInfo)
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
await x402r.disputes.resolve(paymentInfo, 0n, 'partial-refund', 30_000_000n) // refund $30 of $100
```

Shipped plugins (`escrowPeriodActions`, `freezeActions`) fill optional `escrow`/`freeze` slots. Custom extensions can add any namespace. Extensions cannot override defined base keys.

## Refund & Dispute Flow

Non-obvious behaviors integrators should be aware of:

1. **Evidence is 1:1 with RefundRequest** — each RefundRequest gets its own factory-deployed Evidence contract. Different arbiter = different contracts = separate evidence stores. Evidence is required when refund is configured (`refundRequestEvidenceAddress` must be provided alongside `refundRequestAddress`).

2. **In-escrow void auto-approves payer requests** — the RefundRequest hook is wired as `voidPostActionHook`, so any successful `payment.voidPayment()` call atomically settles a pending `RefundRequest` in the same transaction. No separate approve step. `voidPayment` is full-only — it empties the entire authorization regardless of any partial amount the payer requested.

3. **Evidence access control** — arbiter identity comes from `REFUND_REQUEST.ARBITER()`, not from the operator's condition tree. If arbiter is a multisig, that address must call `submitEvidence()`.

4. **Post-escrow refunds use ReceiverRefundCollector** — once the escrow window closes, the receiver calls `payment.refund(paymentInfo, amount, receiverRefundCollector, data)` via the Receiver singleton condition. The merchant must pre-stake an ERC-20 allowance on `ReceiverRefundCollector` (use `payment.approveRefundAllowance(token, amount)`). No arbiter involvement.

5. **Freeze roles** — payer freezes (time extension near deadline), arbiter unfreezes (investigation resolved).

6. **`payment.voidPayment` is gated by an OrCondition** — on marketplace operators, the `voidPreActionCondition` is `OrCondition(ReceiverCondition, StaticAddressCondition(refundRequest))`, so either the receiver or the RefundRequest contract can trigger it. Payers cannot void directly; they file a `RefundRequest` first, and either the merchant or the arbiter approves by calling `voidPayment` themselves.

## Docs

[docs.x402r.org](https://docs.x402r.org)

## License

[Apache-2.0](../../LICENSE)
