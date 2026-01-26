[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / conditions

# Variable: conditions

> `const` **conditions**: `object`

Defined in: [core/src/conditions/index.ts:97](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/conditions/index.ts#L97)

Helper functions for composing conditions

## Type Declaration

### ALWAYS\_TRUE

#### Get Signature

> **get** **ALWAYS\_TRUE**(): `` `0x${string}` ``

AlwaysTrueCondition singleton address

##### Returns

`` `0x${string}` ``

### and()

> `readonly` **and**(`conditionList`): [`AndConditionConfig`](../interfaces/AndConditionConfig.md)

Create an AND condition configuration

#### Parameters

##### conditionList

(`` `0x${string}` `` \| [`ConditionConfig`](../type-aliases/ConditionConfig.md))[]

Array of conditions to combine with AND logic

#### Returns

[`AndConditionConfig`](../interfaces/AndConditionConfig.md)

AND condition config for deployment

### not()

> `readonly` **not**(`condition`): [`NotConditionConfig`](../interfaces/NotConditionConfig.md)

Create a NOT condition configuration

#### Parameters

##### condition

Condition to negate

`` `0x${string}` `` | [`ConditionConfig`](../type-aliases/ConditionConfig.md)

#### Returns

[`NotConditionConfig`](../interfaces/NotConditionConfig.md)

NOT condition config for deployment

### or()

> `readonly` **or**(`conditionList`): [`OrConditionConfig`](../interfaces/OrConditionConfig.md)

Create an OR condition configuration

#### Parameters

##### conditionList

(`` `0x${string}` `` \| [`ConditionConfig`](../type-aliases/ConditionConfig.md))[]

Array of conditions to combine with OR logic

#### Returns

[`OrConditionConfig`](../interfaces/OrConditionConfig.md)

OR condition config for deployment

### PAYER

#### Get Signature

> **get** **PAYER**(): `` `0x${string}` ``

PayerCondition singleton address

##### Returns

`` `0x${string}` ``

### RECEIVER

#### Get Signature

> **get** **RECEIVER**(): `` `0x${string}` ``

ReceiverCondition singleton address

##### Returns

`` `0x${string}` ``

### staticAddress()

> `readonly` **staticAddress**(`designatedAddress`): [`StaticAddressConditionConfig`](../interfaces/StaticAddressConditionConfig.md)

Create a StaticAddressCondition configuration

#### Parameters

##### designatedAddress

`` `0x${string}` ``

The address that will be allowed

#### Returns

[`StaticAddressConditionConfig`](../interfaces/StaticAddressConditionConfig.md)

StaticAddressCondition config for deployment

## Example

```typescript
// Simple: receiver OR designated arbiter
const releaseCondition = conditions.or([
  conditions.RECEIVER,
  arbiterConditionAddress,
]);

// Complex: (payer AND arbiter) OR receiver
const refundCondition = conditions.or([
  conditions.and([conditions.PAYER, arbiterConditionAddress]),
  conditions.RECEIVER,
]);
```
