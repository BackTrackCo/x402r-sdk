[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [client/src](../README.md) / X402rClientConfig

# Interface: X402rClientConfig

Defined in: [client/src/client.ts:19](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L19)

Configuration for X402rClient

## Properties

### escrowAddress?

> `optional` **escrowAddress**: `` `0x${string}` ``

Defined in: [client/src/client.ts:27](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L27)

Optional escrow contract address (defaults from network config)

***

### operatorAddress

> **operatorAddress**: `` `0x${string}` ``

Defined in: [client/src/client.ts:25](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L25)

PaymentOperator contract address

***

### publicClient

> **publicClient**: `object`

Defined in: [client/src/client.ts:21](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L21)

viem PublicClient for reading contract state

***

### refundRequestAddress?

> `optional` **refundRequestAddress**: `` `0x${string}` ``

Defined in: [client/src/client.ts:29](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L29)

Optional RefundRequest contract address (defaults from network config)

***

### walletClient?

> `optional` **walletClient**: `object`

Defined in: [client/src/client.ts:23](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/client/src/client.ts#L23)

Optional viem WalletClient for write operations
