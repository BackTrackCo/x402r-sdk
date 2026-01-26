[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / createFreezePolicyConfig

# Function: createFreezePolicyConfig()

> **createFreezePolicyConfig**(`input`): [`FreezePolicyConfig`](../interfaces/FreezePolicyConfig.md)

Defined in: [core/src/factory/index.ts:175](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L175)

Create a FreezePolicyConfig with defaults for missing fields

## Parameters

### input

[`FreezePolicyConfigInput`](../interfaces/FreezePolicyConfigInput.md)

Partial config with required freeze/unfreeze conditions

## Returns

[`FreezePolicyConfig`](../interfaces/FreezePolicyConfig.md)

Full FreezePolicyConfig

## Example

```typescript
// Payer can freeze/unfreeze with 3 day limit
const config = createFreezePolicyConfig({
  freezeCondition: payerConditionAddress,
  unfreezeCondition: payerConditionAddress,
  freezeDuration: 259200n, // 3 days
});
```
