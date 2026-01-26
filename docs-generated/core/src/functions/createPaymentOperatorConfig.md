[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / createPaymentOperatorConfig

# Function: createPaymentOperatorConfig()

> **createPaymentOperatorConfig**(`input`): [`PaymentOperatorConfig`](../interfaces/PaymentOperatorConfig.md)

Defined in: [core/src/factory/index.ts:83](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L83)

Create a PaymentOperatorConfig with defaults for missing fields

## Parameters

### input

[`PaymentOperatorConfigInput`](../interfaces/PaymentOperatorConfigInput.md)

Partial config with required feeRecipient

## Returns

[`PaymentOperatorConfig`](../interfaces/PaymentOperatorConfig.md)

Full PaymentOperatorConfig with zero addresses for unspecified fields

## Example

```typescript
const config = createPaymentOperatorConfig({
  feeRecipient: '0x1234...',
  releaseCondition: escrowPeriodConditionAddress,
  releaseRecorder: escrowPeriodRecorderAddress,
});
```
