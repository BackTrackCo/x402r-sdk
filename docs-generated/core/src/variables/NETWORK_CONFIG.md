[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / NETWORK\_CONFIG

# Variable: NETWORK\_CONFIG

> `const` **NETWORK\_CONFIG**: `Record`\<`string`, [`NetworkConfig`](../interfaces/NetworkConfig.md)\>

Defined in: [core/src/config/index.ts:33](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/config/index.ts#L33)

Network configuration by EIP-155 chain identifier

## Example

```typescript
const baseSepolia = NETWORK_CONFIG['eip155:84532'];
console.log(baseSepolia.name); // 'Base Sepolia'
```
