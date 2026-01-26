[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [client/src](../README.md) / X402rClient

# Class: X402rClient

Defined in: [client/src/client.ts:60](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L60)

Client SDK for payers using X402r refundable payments

Provides methods for:
- Querying payment state and details
- Requesting and managing refunds
- Freezing payments during escrow period
- Subscribing to payment events

## Example

```typescript
import { X402rClient } from '@x402r/client';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const client = new X402rClient({
  publicClient,
  operatorAddress: '0x...',
});

const state = await client.getPaymentState(paymentInfo);
```

## Constructors

### Constructor

> **new X402rClient**(`config`): `X402rClient`

Defined in: [client/src/client.ts:72](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L72)

#### Parameters

##### config

[`X402rClientConfig`](../interfaces/X402rClientConfig.md)

#### Returns

`X402rClient`

## Properties

### escrowAddress?

> `readonly` `optional` **escrowAddress**: `` `0x${string}` ``

Defined in: [client/src/client.ts:68](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L68)

Escrow contract address

***

### operatorAddress

> `readonly` **operatorAddress**: `` `0x${string}` ``

Defined in: [client/src/client.ts:66](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L66)

PaymentOperator contract address

***

### publicClient

> `readonly` **publicClient**: `object`

Defined in: [client/src/client.ts:62](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L62)

viem PublicClient for reading contract state

***

### refundRequestAddress?

> `readonly` `optional` **refundRequestAddress**: `` `0x${string}` ``

Defined in: [client/src/client.ts:70](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L70)

RefundRequest contract address

***

### walletClient?

> `readonly` `optional` **walletClient**: `object`

Defined in: [client/src/client.ts:64](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L64)

Optional viem WalletClient for write operations

## Methods

### cancelRefundRequest()

> **cancelRefundRequest**(`paymentInfo`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [client/src/client.ts:320](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L320)

Cancel a pending refund request

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Throws

Error if walletClient is not configured

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const { txHash } = await client.cancelRefundRequest(paymentInfo);
console.log(`Refund request cancelled: ${txHash}`);
```

***

### freezePayment()

> **freezePayment**(`paymentInfo`, `recorderAddress`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [client/src/client.ts:393](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L393)

Freeze a payment to extend the escrow period

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

##### recorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Throws

Error if walletClient is not configured

#### Example

```typescript
const { txHash } = await client.freezePayment(paymentInfo, recorderAddress);
console.log(`Payment frozen: ${txHash}`);
```

***

### getAuthorizationTime()

> **getAuthorizationTime**(`paymentInfo`, `recorderAddress`): `Promise`\<`bigint`\>

Defined in: [client/src/client.ts:488](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L488)

Get the authorization time for a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

##### recorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

#### Returns

`Promise`\<`bigint`\>

The timestamp when the payment was authorized

#### Example

```typescript
const authTime = await client.getAuthorizationTime(paymentInfo, recorderAddress);
console.log(`Authorized at: ${new Date(Number(authTime) * 1000)}`);
```

***

### getMyPayments()

> **getMyPayments**(): `Promise`\<\{ `hashes`: readonly `` `0x${string}` ``[]; \}\>

Defined in: [client/src/client.ts:192](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L192)

Get all payment hashes where the current wallet is the payer

#### Returns

`Promise`\<\{ `hashes`: readonly `` `0x${string}` ``[]; \}\>

Object with hashes array

#### Throws

Error if walletClient is not configured

#### Example

```typescript
const { hashes } = await client.getMyPayments();
for (const hash of hashes) {
  const details = await client.getPaymentDetails(hash);
  console.log(`Payment to ${details.receiver}`);
}
```

***

### getMyRefundRequests()

> **getMyRefundRequests**(): `Promise`\<readonly `` `0x${string}` ``[]\>

Defined in: [client/src/client.ts:356](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L356)

Get all refund request hashes for the current wallet

#### Returns

`Promise`\<readonly `` `0x${string}` ``[]\>

Array of payment info hashes with refund requests

#### Throws

Error if walletClient is not configured

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const hashes = await client.getMyRefundRequests();
for (const hash of hashes) {
  console.log(`Refund request: ${hash}`);
}
```

***

### getPaymentDetails()

> **getPaymentDetails**(`paymentInfoHash`): `Promise`\<[`PaymentInfo`](../interfaces/PaymentInfo.md)\>

Defined in: [client/src/client.ts:165](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L165)

Get stored PaymentInfo for a given hash

#### Parameters

##### paymentInfoHash

`` `0x${string}` ``

The hash of the PaymentInfo

#### Returns

`Promise`\<[`PaymentInfo`](../interfaces/PaymentInfo.md)\>

The stored PaymentInfo struct

#### Example

```typescript
const details = await client.getPaymentDetails(paymentInfoHash);
console.log(`Receiver: ${details.receiver}`);
```

***

### getPaymentState()

> **getPaymentState**(`paymentInfo`): `Promise`\<[`PaymentState`](../enumerations/PaymentState.md)\>

Defined in: [client/src/client.ts:96](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L96)

Get the current state of a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<[`PaymentState`](../enumerations/PaymentState.md)\>

The payment state (NonExistent, InEscrow, Released, Settled, Expired)

#### Example

```typescript
const state = await client.getPaymentState(paymentInfo);
if (state === PaymentState.InEscrow) {
  console.log('Payment is in escrow');
}
```

***

### getRefundStatus()

> **getRefundStatus**(`paymentInfo`): `Promise`\<[`RequestStatus`](../enumerations/RequestStatus.md)\>

Defined in: [client/src/client.ts:256](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L256)

Get the status of a refund request

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<[`RequestStatus`](../enumerations/RequestStatus.md)\>

The refund request status (Pending, Approved, Denied, Cancelled)

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const status = await client.getRefundStatus(paymentInfo);
if (status === RequestStatus.Pending) {
  console.log('Refund request is pending');
}
```

***

### hasRefundRequest()

> **hasRefundRequest**(`paymentInfo`): `Promise`\<`boolean`\>

Defined in: [client/src/client.ts:226](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L226)

Check if a refund request exists for a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<`boolean`\>

True if a refund request exists

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const hasRequest = await client.hasRefundRequest(paymentInfo);
if (hasRequest) {
  console.log('Refund request exists');
}
```

***

### isEscrowPeriodPassed()

> **isEscrowPeriodPassed**(`paymentInfo`, `recorderAddress`): `Promise`\<\{ `authTime`: `bigint`; `passed`: `boolean`; \}\>

Defined in: [client/src/client.ts:517](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L517)

Check if the escrow period has passed for a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

##### recorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

#### Returns

`Promise`\<\{ `authTime`: `bigint`; `passed`: `boolean`; \}\>

Object with passed status and authorization time

#### Example

```typescript
const { passed, authTime } = await client.isEscrowPeriodPassed(paymentInfo, recorderAddress);
if (passed) {
  console.log('Escrow period has passed');
}
```

***

### isFrozen()

> **isFrozen**(`paymentInfo`, `recorderAddress`): `Promise`\<`boolean`\>

Defined in: [client/src/client.ts:461](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L461)

Check if a payment is currently frozen

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

##### recorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

#### Returns

`Promise`\<`boolean`\>

True if payment is frozen

#### Example

```typescript
if (await client.isFrozen(paymentInfo, recorderAddress)) {
  console.log('Payment is frozen');
}
```

***

### isInEscrow()

> **isInEscrow**(`paymentInfoHash`): `Promise`\<`boolean`\>

Defined in: [client/src/client.ts:142](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L142)

Check if a payment is currently in escrow

#### Parameters

##### paymentInfoHash

`` `0x${string}` ``

The hash of the PaymentInfo

#### Returns

`Promise`\<`boolean`\>

True if payment is in escrow (has capturable amount)

#### Example

```typescript
if (await client.isInEscrow(paymentInfoHash)) {
  console.log('Can still be refunded');
}
```

***

### paymentExists()

> **paymentExists**(`paymentInfoHash`): `Promise`\<`boolean`\>

Defined in: [client/src/client.ts:118](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L118)

Check if a payment exists (has been authorized)

#### Parameters

##### paymentInfoHash

`` `0x${string}` ``

The hash of the PaymentInfo

#### Returns

`Promise`\<`boolean`\>

True if payment exists

#### Example

```typescript
const exists = await client.paymentExists(paymentInfoHash);
```

***

### requestRefund()

> **requestRefund**(`paymentInfo`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [client/src/client.ts:285](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L285)

Submit a refund request for a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Throws

Error if walletClient is not configured

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const { txHash } = await client.requestRefund(paymentInfo);
console.log(`Refund requested: ${txHash}`);
```

***

### unfreezePayment()

> **unfreezePayment**(`paymentInfo`, `recorderAddress`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [client/src/client.ts:427](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L427)

Unfreeze a payment that was previously frozen

#### Parameters

##### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

##### recorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Throws

Error if walletClient is not configured

#### Example

```typescript
const { txHash } = await client.unfreezePayment(paymentInfo, recorderAddress);
console.log(`Payment unfrozen: ${txHash}`);
```

***

### watchFreezeEvents()

> **watchFreezeEvents**(`recorderAddress`, `callback`): `object`

Defined in: [client/src/client.ts:713](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L713)

Watch for freeze and unfreeze events

#### Parameters

##### recorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

##### callback

(`event`) => `void`

Callback function called on freeze events

#### Returns

`object`

Object with unsubscribe function

##### unsubscribe()

> **unsubscribe**: () => `void`

###### Returns

`void`

#### Example

```typescript
const { unsubscribe } = client.watchFreezeEvents(recorderAddress, (event) => {
  console.log('Freeze event:', event);
});
// Later: unsubscribe();
```

***

### watchMyPayments()

> **watchMyPayments**(`callback`): `object`

Defined in: [client/src/client.ts:674](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L674)

Watch for new payments where the current wallet is the payer

#### Parameters

##### callback

(`event`) => `void`

Callback function called on new payment events

#### Returns

`object`

Object with unsubscribe function

##### unsubscribe()

> **unsubscribe**: () => `void`

###### Returns

`void`

#### Throws

Error if walletClient is not configured

#### Example

```typescript
const { unsubscribe } = client.watchMyPayments((event) => {
  console.log('New payment:', event);
});
// Later: unsubscribe();
```

***

### watchPaymentState()

> **watchPaymentState**(`_paymentInfoHash`, `callback`): `object`

Defined in: [client/src/client.ts:548](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L548)

Watch for payment state changes (releases and refunds)

#### Parameters

##### \_paymentInfoHash

`` `0x${string}` ``

##### callback

(`event`) => `void`

Callback function called when state changes

#### Returns

`object`

Object with unsubscribe function

##### unsubscribe()

> **unsubscribe**: () => `void`

###### Returns

`void`

#### Example

```typescript
const { unsubscribe } = client.watchPaymentState(paymentInfoHash, (event) => {
  console.log('Payment state changed:', event);
});
// Later: unsubscribe();
```

***

### watchRefundRequests()

> **watchRefundRequests**(`callback`): `object`

Defined in: [client/src/client.ts:604](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L604)

Watch for refund request events

#### Parameters

##### callback

(`event`) => `void`

Callback function called on refund request events

#### Returns

`object`

Object with unsubscribe function

##### unsubscribe()

> **unsubscribe**: () => `void`

###### Returns

`void`

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const { unsubscribe } = client.watchRefundRequests((event) => {
  console.log('Refund event:', event);
});
// Later: unsubscribe();
```
