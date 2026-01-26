[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / getNetworkConfig

# Function: getNetworkConfig()

> **getNetworkConfig**(`networkId`): [`NetworkConfig`](../interfaces/NetworkConfig.md) \| `undefined`

Defined in: [core/src/config/index.ts:70](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/config/index.ts#L70)

Get network configuration by EIP-155 chain identifier

## Parameters

### networkId

`string`

EIP-155 chain identifier (e.g., 'eip155:84532')

## Returns

[`NetworkConfig`](../interfaces/NetworkConfig.md) \| `undefined`

Network configuration or undefined if not supported

## Example

```typescript
const config = getNetworkConfig('eip155:84532');
if (config) {
  console.log(config.authCaptureEscrow);
}
```
