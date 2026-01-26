[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / isSupportedNetwork

# Function: isSupportedNetwork()

> **isSupportedNetwork**(`networkId`): `boolean`

Defined in: [core/src/config/index.ts:87](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/config/index.ts#L87)

Check if a network is supported

## Parameters

### networkId

`string`

EIP-155 chain identifier to check

## Returns

`boolean`

true if the network is supported

## Example

```typescript
if (isSupportedNetwork('eip155:84532')) {
  // Safe to use this network
}
```
