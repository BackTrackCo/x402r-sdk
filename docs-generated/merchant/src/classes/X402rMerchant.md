[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [merchant/src](../README.md) / X402rMerchant

# Class: X402rMerchant

Defined in: [merchant/src/merchant.ts:76](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L76)

Merchant SDK for servers using X402r refundable payments

Provides methods for:
- Releasing funds from escrow
- Processing refunds
- Approving/denying refund requests
- Managing escrow periods
- Subscribing to payment events

## Example

```typescript
import { X402rMerchant } from '@x402r/merchant';
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

const merchant = new X402rMerchant({
  publicClient,
  walletClient,
  operatorAddress: '0x...',
});

// Release funds from escrow
const { txHash } = await merchant.release(paymentInfo, amount);
```

## Constructors

### Constructor

> **new X402rMerchant**(`config`): `X402rMerchant`

Defined in: [merchant/src/merchant.ts:90](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L90)

#### Parameters

##### config

[`X402rMerchantConfig`](../interfaces/X402rMerchantConfig.md)

#### Returns

`X402rMerchant`

## Properties

### chainId

> `readonly` **chainId**: `number`

Defined in: [merchant/src/merchant.ts:88](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L88)

Chain ID

***

### escrowAddress?

> `readonly` `optional` **escrowAddress**: `` `0x${string}` ``

Defined in: [merchant/src/merchant.ts:84](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L84)

Escrow contract address

***

### operatorAddress

> `readonly` **operatorAddress**: `` `0x${string}` ``

Defined in: [merchant/src/merchant.ts:82](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L82)

PaymentOperator contract address

***

### publicClient

> `readonly` **publicClient**: `object`

Defined in: [merchant/src/merchant.ts:78](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L78)

viem PublicClient for reading contract state

***

### refundRequestAddress?

> `readonly` `optional` **refundRequestAddress**: `` `0x${string}` ``

Defined in: [merchant/src/merchant.ts:86](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L86)

RefundRequest contract address

***

### walletClient

> `readonly` **walletClient**: `object`

Defined in: [merchant/src/merchant.ts:80](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L80)

viem WalletClient for write operations

## Methods

### approveRefundRequest()

> **approveRefundRequest**(`paymentInfo`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [merchant/src/merchant.ts:323](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L323)

Approve a refund request

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
const { txHash } = await merchant.approveRefundRequest(paymentInfo);
console.log(`Refund approved: ${txHash}`);
```

***

### denyRefundRequest()

> **denyRefundRequest**(`paymentInfo`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [merchant/src/merchant.ts:353](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L353)

Deny a refund request

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
const { txHash } = await merchant.denyRefundRequest(paymentInfo);
console.log(`Refund denied: ${txHash}`);
```

***

### getPaymentAmounts()

> **getPaymentAmounts**(`paymentInfo`): `Promise`\<\{ `capturableAmount`: `bigint`; `refundableAmount`: `bigint`; \}\>

Defined in: [merchant/src/merchant.ts:163](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L163)

Get the capturable and refundable amounts for a payment

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

#### Returns

`Promise`\<\{ `capturableAmount`: `bigint`; `refundableAmount`: `bigint`; \}\>

Object with capturableAmount and refundableAmount

#### Throws

Error if escrowAddress is not configured

#### Example

```typescript
const { capturableAmount, refundableAmount } = await merchant.getPaymentAmounts(paymentInfo);
console.log(`Can capture: ${capturableAmount}, can refund: ${refundableAmount}`);
```

***

### getPaymentState()

> **getPaymentState**(`paymentInfo`): `Promise`\<[`PaymentState`](../../../client/src/enumerations/PaymentState.md)\>

Defined in: [merchant/src/merchant.ts:115](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L115)

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
const state = await merchant.getPaymentState(paymentInfo);
if (state === PaymentState.InEscrow) {
  console.log('Payment is in escrow, can be released');
}
```

***

### getPendingRefundRequests()

> **getPendingRefundRequests**(): `Promise`\<readonly `` `0x${string}` ``[]\>

Defined in: [merchant/src/merchant.ts:384](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L384)

Get all pending refund request hashes for the current receiver

#### Returns

`Promise`\<readonly `` `0x${string}` ``[]\>

Array of payment info hashes with pending refund requests

#### Throws

Error if refundRequestAddress is not configured

#### Example

```typescript
const hashes = await merchant.getPendingRefundRequests();
for (const hash of hashes) {
  console.log(`Pending refund: ${hash}`);
}
```

***

### getReceiverPayments()

> **getReceiverPayments**(): `Promise`\<\{ `hashes`: readonly `` `0x${string}` ``[]; \}\>

Defined in: [merchant/src/merchant.ts:139](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L139)

Get all payment hashes where the current wallet is the receiver

#### Returns

`Promise`\<\{ `hashes`: readonly `` `0x${string}` ``[]; \}\>

Object with hashes array

#### Example

```typescript
const { hashes } = await merchant.getReceiverPayments();
for (const hash of hashes) {
  console.log(`Payment hash: ${hash}`);
}
```

***

### getRefundStatus()

> **getRefundStatus**(`paymentInfo`): `Promise`\<[`RequestStatus`](../../../client/src/enumerations/RequestStatus.md)\>

Defined in: [merchant/src/merchant.ts:295](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L295)

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
const status = await merchant.getRefundStatus(paymentInfo);
if (status === RequestStatus.Pending) {
  console.log('Refund request is pending');
}
```

***

### hasRefundRequest()

> **hasRefundRequest**(`paymentInfo`): `Promise`\<`boolean`\>

Defined in: [merchant/src/merchant.ts:265](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L265)

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
const hasRequest = await merchant.hasRefundRequest(paymentInfo);
if (hasRequest) {
  console.log('Refund request exists');
}
```

***

### isFrozen()

> **isFrozen**(`paymentInfo`, `escrowRecorderAddress`): `Promise`\<`boolean`\>

Defined in: [merchant/src/merchant.ts:445](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L445)

Check if a payment is currently frozen

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

##### escrowRecorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

#### Returns

`Promise`\<`boolean`\>

True if the payment is frozen

#### Example

```typescript
const frozen = await merchant.isFrozen(paymentInfo, escrowRecorderAddress);
if (frozen) {
  console.log('Payment is frozen');
}
```

***

### refundInEscrow()

> **refundInEscrow**(`paymentInfo`, `amount`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [merchant/src/merchant.ts:232](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L232)

Refund funds that are still in escrow back to the payer

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

##### amount

`bigint`

Amount to refund in token units

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Example

```typescript
const { txHash } = await merchant.refundInEscrow(paymentInfo, BigInt('500000'));
console.log(`Refunded: ${txHash}`);
```

***

### release()

> **release**(`paymentInfo`, `amount`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [merchant/src/merchant.ts:203](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L203)

Release funds from escrow to the receiver

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

##### amount

`bigint`

Amount to release in token units

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Example

```typescript
const { txHash } = await merchant.release(paymentInfo, BigInt('500000'));
console.log(`Released funds: ${txHash}`);
```

***

### unfreezePayment()

> **unfreezePayment**(`paymentInfo`, `escrowRecorderAddress`): `Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Defined in: [merchant/src/merchant.ts:414](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L414)

Unfreeze a payment that was previously frozen

#### Parameters

##### paymentInfo

[`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

The payment information struct

##### escrowRecorderAddress

`` `0x${string}` ``

The EscrowPeriodRecorder contract address

#### Returns

`Promise`\<\{ `txHash`: `` `0x${string}` ``; \}\>

Transaction hash

#### Example

```typescript
const { txHash } = await merchant.unfreezePayment(paymentInfo, escrowRecorderAddress);
console.log(`Payment unfrozen: ${txHash}`);
```

***

### watchFreezeEvents()

> **watchFreezeEvents**(`escrowRecorderAddress`, `callback`): `object`

Defined in: [merchant/src/merchant.ts:545](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L545)

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
const { unsubscribe } = merchant.watchFreezeEvents(escrowRecorderAddress, (event) => {
  console.log('Freeze event:', event);
});

// Later: stop watching
unsubscribe();
```

***

### watchRefundRequests()

> **watchRefundRequests**(`callback`): `object`

Defined in: [merchant/src/merchant.ts:478](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L478)

Watch for new refund requests where the current wallet is the receiver

#### Parameters

##### callback

(`event`) => `void`

Function to call when a refund request event is received

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
const { unsubscribe } = merchant.watchRefundRequests((event) => {
  console.log('New refund request:', event);
});

// Later: stop watching
unsubscribe();
```

***

### watchReleases()

> **watchReleases**(`callback`): `object`

Defined in: [merchant/src/merchant.ts:513](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L513)

Watch for release events on the operator

#### Parameters

##### callback

(`event`) => `void`

Function to call when a release event is received

#### Returns

`object`

Object with unsubscribe function

##### unsubscribe()

> **unsubscribe**: () => `void`

###### Returns

`void`

#### Example

```typescript
const { unsubscribe } = merchant.watchReleases((event) => {
  console.log('Release executed:', event);
});

// Later: stop watching
unsubscribe();
```
