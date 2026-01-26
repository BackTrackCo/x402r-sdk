[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / createEscrowPeriodConfig

# Function: createEscrowPeriodConfig()

> **createEscrowPeriodConfig**(`input`): [`EscrowPeriodConfig`](../interfaces/EscrowPeriodConfig.md)

Defined in: [core/src/factory/index.ts:131](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L131)

Create an EscrowPeriodConfig with defaults for missing fields

## Parameters

### input

[`EscrowPeriodConfigInput`](../interfaces/EscrowPeriodConfigInput.md)

Partial config with required escrowPeriod

## Returns

[`EscrowPeriodConfig`](../interfaces/EscrowPeriodConfig.md)

Full EscrowPeriodConfig

## Example

```typescript
// 7 day escrow period without freeze
const config = createEscrowPeriodConfig({
  escrowPeriod: 604800n,
});
```
