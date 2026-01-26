[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / isValidAddress

# Function: isValidAddress()

> **isValidAddress**(`address`): `` address is `0x${string}` ``

Defined in: [core/src/types/index.ts:130](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L130)

Validates an Ethereum address format

## Parameters

### address

`string`

The address to validate

## Returns

`` address is `0x${string}` ``

true if the address is a valid format

## Example

```typescript
isValidAddress('0x1234567890123456789012345678901234567890'); // true
isValidAddress('0x123'); // false
```
