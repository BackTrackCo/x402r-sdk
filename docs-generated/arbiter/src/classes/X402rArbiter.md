[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [arbiter/src](../README.md) / X402rArbiter

# Class: X402rArbiter

Defined in: [arbiter/src/arbiter.ts:75](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L75)

Arbiter SDK for dispute resolution in X402r refundable payments

Provides methods for:
- Approving or denying refund requests
- Executing refunds for disputed payments
- Querying pending cases
- Batch operations for efficiency
- AI integration hooks for automated dispute resolution

## Example

```typescript
import { X402rArbiter } from '@x402r/arbiter';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0x...');

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

const arbiter = new X402rArbiter({
  publicClient,
  walletClient,
  operatorAddress: '0x...',
  refundRequestAddress: '0x...',
});

// Approve a refund request
const { txHash } = await arbiter.approveRefund(paymentInfo);
```

## Constructors

### Constructor

> **new X402rArbiter**(`config`): `X402rArbiter`

Defined in: [arbiter/src/arbiter.ts:89](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L89)

#### Parameters

##### config

[`X402rArbiterConfig`](../interfaces/X402rArbiterConfig.md)

#### Returns

`X402rArbiter`

## Properties

### chainId

> `readonly` **chainId**: `number`

Defined in: [arbiter/src/arbiter.ts:87](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L87)

Chain ID

***

### escrowAddress?

> `readonly` `optional` **escrowAddress**: `` `0x${string}` ``

Defined in: [arbiter/src/arbiter.ts:83](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L83)

Escrow contract address

***

### operatorAddress

> `readonly` **operatorAddress**: `` `0x${string}` ``

Defined in: [arbiter/src/arbiter.ts:81](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L81)

PaymentOperator contract address

***

### publicClient

> `readonly` **publicClient**: `object`

Defined in: [arbiter/src/arbiter.ts:77](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L77)

viem PublicClient for reading contract state

***

### refundRequestAddress?

> `readonly` `optional` **refundRequestAddress**: `` `0x${string}` ``

Defined in: [arbiter/src/arbiter.ts:85](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L85)

RefundRequest contract address

***

### walletClient

> `readonly` **walletClient**: `object`

Defined in: [arbiter/src/arbiter.ts:79](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L79)

viem WalletClient for write operations

## Methods

### approveRefund()

> **approveRefund**(`paymentInfo`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [arbiter/src/arbiter.ts:170](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L170)

Approve a refund request as the arbiter

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const { txHash } = await arbiter.approveRefund(paymentInfo);
console.log(`Refund approved: ${txHash}`);
```

***

### batchApprove()

> **batchApprove**(`paymentInfos`): `Promise`\<`object`[]\>

Defined in: [arbiter/src/arbiter.ts:271](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L271)

Approve multiple refund requests in batch

#### Parameters

##### paymentInfos

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)[]

Array of payment information structs

#### Returns

`Promise`\<`object`[]\>

Array of transaction results

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const results = await arbiter.batchApprove([paymentInfo1, paymentInfo2, paymentInfo3]);
for (const { txHash } of results) {
  console.log(`Approved: ${txHash}`);
}
```

***

### batchDeny()

> **batchDeny**(`paymentInfos`): `Promise`\<`object`[]\>

Defined in: [arbiter/src/arbiter.ts:305](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L305)

Deny multiple refund requests in batch

#### Parameters

##### paymentInfos

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)[]

Array of payment information structs

#### Returns

`Promise`\<`object`[]\>

Array of transaction results

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const results = await arbiter.batchDeny([paymentInfo1, paymentInfo2]);
for (const { txHash } of results) {
  console.log(`Denied: ${txHash}`);
}
```

***

### denyRefund()

> **denyRefund**(`paymentInfo`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [arbiter/src/arbiter.ts:200](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L200)

Deny a refund request as the arbiter

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const { txHash } = await arbiter.denyRefund(paymentInfo);
console.log(`Refund denied: ${txHash}`);
```

***

### executeRefundInEscrow()

> **executeRefundInEscrow**(`paymentInfo`, `amount?`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [arbiter/src/arbiter.ts:236](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L236)

Execute a refund for a payment in escrow

This is typically called after approving a refund request to actually
transfer the funds back to the payer.

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

##### amount?

`bigint`

Amount to refund (defaults to maxAmount)

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Example

```typescript
// Refund full amount
const { txHash } = await arbiter.executeRefundInEscrow(paymentInfo);

// Refund partial amount
const { txHash } = await arbiter.executeRefundInEscrow(paymentInfo, BigInt('500000'));
```

***

### getArbiterPayments()

> **getArbiterPayments**(`receiverAddress?`): `Promise`\<\{ `hashes`: readonly `` `0x${string}` ``[]; \}\>

Defined in: [arbiter/src/arbiter.ts:399](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L399)

Get all refund request hashes for a receiver

#### Parameters

##### receiverAddress?

`` `0x${string}` ``

The receiver address to query (defaults to wallet account)

#### Returns

`Promise`\<\{ `hashes`: readonly `` `0x${string}` ``[]; \}\>

Object with hashes array

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const { hashes } = await arbiter.getArbiterPayments('0x...');
console.log(`Found ${hashes.length} refund requests`);
```

***

### getPaymentState()

> **getPaymentState**(`paymentInfo`): `Promise`\<[`PaymentState`](../../../client/src/enumerations/PaymentState.md)\>

Defined in: [arbiter/src/arbiter.ts:114](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L114)

Get the current state of a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<[`PaymentState`](../../../client/src/enumerations/PaymentState.md)\>

The payment state (NonExistent, InEscrow, Released, Settled, Expired)

#### Example

```typescript
const state = await arbiter.getPaymentState(paymentInfo);
if (state === PaymentState.InEscrow) {
  console.log('Payment is in escrow, can be refunded');
}
```

***

### getPendingCases()

> **getPendingCases**(`receiverAddress?`): `Promise`\<readonly `` `0x${string}` ``[]\>

Defined in: [arbiter/src/arbiter.ts:339](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L339)

Get all pending refund requests for a receiver that the arbiter can decide on

#### Parameters

##### receiverAddress?

`` `0x${string}` ``

The receiver address to query (defaults to wallet account)

#### Returns

`Promise`\<readonly `` `0x${string}` ``[]\>

Array of payment info hashes with pending refund requests

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const hashes = await arbiter.getPendingCases('0x...');
console.log(`${hashes.length} pending cases to review`);
```

***

### getRefundStatus()

> **getRefundStatus**(`paymentInfo`): `Promise`\<[`RequestStatus`](../../../client/src/enumerations/RequestStatus.md)\>

Defined in: [arbiter/src/arbiter.ts:371](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L371)

Get the status of a refund request

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<[`RequestStatus`](../../../client/src/enumerations/RequestStatus.md)\>

The refund request status (Pending, Approved, Denied, Cancelled)

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const status = await arbiter.getRefundStatus(paymentInfo);
if (status === RequestStatus.Pending) {
  console.log('Case needs review');
}
```

***

### hasRefundRequest()

> **hasRefundRequest**(`paymentInfo`): `Promise`\<`boolean`\>

Defined in: [arbiter/src/arbiter.ts:140](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L140)

Check if a refund request exists for a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<`boolean`\>

True if a refund request exists

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const hasRequest = await arbiter.hasRefundRequest(paymentInfo);
if (hasRequest) {
  console.log('Refund request exists');
}
```

***

### watchDecisions()

> **watchDecisions**(`callback`): `object`

Defined in: [arbiter/src/arbiter.ts:471](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L471)

Watch for refund request status updates (decisions made)

#### Parameters

##### callback

(`event`) => `void`

Function to call when a decision is made

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
const { unsubscribe } = arbiter.watchDecisions((event) => {
  console.log('Decision made:', event);
});

// Later: stop watching
unsubscribe();
```

***

### watchFreezeEvents()

> **watchFreezeEvents**(`escrowRecorderAddress`, `callback`): `object`

Defined in: [arbiter/src/arbiter.ts:507](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L507)

Watch for freeze/unfreeze events on an escrow recorder

#### Parameters

##### escrowRecorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

##### callback

(`event`) => `void`

Function to call when a freeze event is received

#### Returns

`object`

Object with unsubscribe function

##### unsubscribe()

> **unsubscribe**: () => `void`

###### Returns

`void`

#### Example

```typescript
const { unsubscribe } = arbiter.watchFreezeEvents(escrowRecorderAddress, (event) => {
  console.log('Freeze event:', event);
});

// Later: stop watching
unsubscribe();
```

***

### watchNewCases()

> **watchNewCases**(`callback`): `object`

Defined in: [arbiter/src/arbiter.ts:435](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L435)

Watch for new refund requests (new cases to review)

#### Parameters

##### callback

(`event`) => `void`

Function to call when a new refund request is created

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
const { unsubscribe } = arbiter.watchNewCases((event) => {
  console.log('New case:', event);
});

// Later: stop watching
unsubscribe();
```
