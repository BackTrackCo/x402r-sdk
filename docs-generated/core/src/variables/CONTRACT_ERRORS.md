[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / CONTRACT\_ERRORS

# Variable: CONTRACT\_ERRORS

> `const` **CONTRACT\_ERRORS**: `Record`\<[`ContractErrorName`](../type-aliases/ContractErrorName.md), [`ContractErrorDefinition`](../interfaces/ContractErrorDefinition.md)\>

Defined in: [core/src/errors/index.ts:78](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L78)

All known contract errors in the X402r protocol

## Example

```typescript
const invalidOp = CONTRACT_ERRORS.InvalidOperator;
console.log(invalidOp.selector); // '0x...'
console.log(invalidOp.message);  // 'The specified operator is invalid'
```
