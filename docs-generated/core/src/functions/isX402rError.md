[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / isX402rError

# Function: isX402rError()

> **isX402rError**(`error`): `error is X402rError`

Defined in: [core/src/errors/index.ts:189](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/errors/index.ts#L189)

Check if an error is an X402rError

## Parameters

### error

`unknown`

The error to check

## Returns

`error is X402rError`

true if the error is an X402rError

## Example

```typescript
try {
  await contract.release(...)
} catch (e) {
  if (isX402rError(e)) {
    console.log(e.name, e.message);
  }
}
```
