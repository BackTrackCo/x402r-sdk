[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / X402rError

# Class: X402rError

Defined in: [core/src/errors/index.ts:158](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L158)

Custom error class for X402r protocol errors

## Example

```typescript
throw new X402rError('InvalidOperator', 'The operator address is invalid');
```

## Extends

- `Error`

## Constructors

### Constructor

> **new X402rError**(`name`, `message`, `args?`): `X402rError`

Defined in: [core/src/errors/index.ts:164](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L164)

#### Parameters

##### name

[`ContractErrorName`](../type-aliases/ContractErrorName.md)

##### message

`string`

##### args?

`Record`\<`string`, `unknown`\>

#### Returns

`X402rError`

#### Overrides

`Error.constructor`

## Properties

### args?

> `optional` **args**: `Record`\<`string`, `unknown`\>

Defined in: [core/src/errors/index.ts:162](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L162)

Optional error arguments from contract

***

### name

> **name**: [`ContractErrorName`](../type-aliases/ContractErrorName.md)

Defined in: [core/src/errors/index.ts:160](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L160)

Error name from ContractErrorName

#### Overrides

`Error.name`
