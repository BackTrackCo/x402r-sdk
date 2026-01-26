[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / isValidPaymentInfo

# Function: isValidPaymentInfo()

> **isValidPaymentInfo**(`paymentInfo`): `boolean`

Defined in: [core/src/types/index.ts:148](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L148)

Validates a PaymentInfo object

## Parameters

### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The PaymentInfo to validate

## Returns

`boolean`

true if all required fields are valid

## Example

```typescript
const isValid = isValidPaymentInfo(paymentInfo);
if (!isValid) {
  throw new Error('Invalid payment info');
}
```
