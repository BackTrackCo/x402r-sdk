[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / ContractErrorDefinition

# Interface: ContractErrorDefinition

Defined in: [core/src/errors/index.ts:33](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L33)

Error definition with selector and human-readable message

## Properties

### message

> **message**: `string`

Defined in: [core/src/errors/index.ts:39](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L39)

Human-readable error message

***

### name

> **name**: [`ContractErrorName`](../type-aliases/ContractErrorName.md)

Defined in: [core/src/errors/index.ts:35](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L35)

Error name

***

### selector

> **selector**: `` `0x${string}` ``

Defined in: [core/src/errors/index.ts:37](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L37)

4-byte selector (first 4 bytes of keccak256 of error signature)

***

### signature

> **signature**: `string`

Defined in: [core/src/errors/index.ts:41](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L41)

Error signature (e.g., "InvalidOperator()")
