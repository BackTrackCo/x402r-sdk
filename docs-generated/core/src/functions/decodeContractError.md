[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / decodeContractError

# Function: decodeContractError()

> **decodeContractError**(`data`): [`DecodedContractError`](../interfaces/DecodedContractError.md) \| `null`

Defined in: [core/src/errors/index.ts:220](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L220)

Decode a contract error from its hex data

## Parameters

### data

`string`

Hex-encoded error data (at least 4 bytes for selector)

## Returns

[`DecodedContractError`](../interfaces/DecodedContractError.md) \| `null`

Decoded error or null if unknown

## Example

```typescript
const error = decodeContractError('0x3b7fc7f9');
if (error) {
  console.log(error.name);    // 'InvalidOperator'
  console.log(error.message); // 'The specified operator is invalid'
}
```
