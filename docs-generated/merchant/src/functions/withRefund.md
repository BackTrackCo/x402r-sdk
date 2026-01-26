[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [merchant/src](../README.md) / withRefund

# Function: withRefund()

> **withRefund**\<`T`\>(`routes`, `operatorAddress`, `options?`): `T`

Defined in: [merchant/src/helpers.ts:132](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/helpers.ts#L132)

Add x402r refund metadata to all payment options in a routes configuration

This is a convenience wrapper that applies refundable() to all payment
options across all routes.

## Type Parameters

### T

`T` *extends* [`RoutesConfig`](../interfaces/RoutesConfig.md)

## Parameters

### routes

`T`

The routes configuration object

### operatorAddress

`` `0x${string}` ``

The PaymentOperator contract address

### options?

[`RefundableOptions`](../interfaces/RefundableOptions.md)

Additional refundable options

## Returns

`T`

The routes config with x402r metadata added to all payment options

## Example

```typescript
import { withRefund } from '@x402r/merchant';

const routes = withRefund({
  '/api/resource': {
    paymentOptions: [{
      scheme: 'evm',
      network: 'base-sepolia',
      token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      maxAmountRequired: '1000000',
      resource: '/api/resource',
    }],
  },
}, '0x...operatorAddress');
```
