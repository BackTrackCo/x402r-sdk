[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [merchant/src](../README.md) / refundable

# Function: refundable()

> **refundable**\<`T`\>(`option`, `operatorAddress`, `options?`): `T` & `object`

Defined in: [merchant/src/helpers.ts:81](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/helpers.ts#L81)

Mark a payment option as refundable by adding x402r metadata

This adds the necessary metadata to route payments through the
PaymentOperator for refund support.

## Type Parameters

### T

`T` *extends* [`PaymentOption`](../interfaces/PaymentOption.md)

## Parameters

### option

`T`

The payment option to make refundable

### operatorAddress

`` `0x${string}` ``

The PaymentOperator contract address

### options?

[`RefundableOptions`](../interfaces/RefundableOptions.md)

Additional refundable options

## Returns

`T` & `object`

The payment option with x402r metadata added

## Example

```typescript
import { refundable } from '@x402r/merchant';

const option = refundable({
  scheme: 'evm',
  network: 'base-sepolia',
  token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  maxAmountRequired: '1000000',
  resource: '/api/resource',
}, '0x...operatorAddress');
```
