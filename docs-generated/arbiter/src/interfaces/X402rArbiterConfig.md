[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [arbiter/src](../README.md) / X402rArbiterConfig

# Interface: X402rArbiterConfig

Defined in: [arbiter/src/arbiter.ts:19](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L19)

Configuration for X402rArbiter

## Properties

### chainId?

> `optional` **chainId**: `number`

Defined in: [arbiter/src/arbiter.ts:31](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L31)

Chain ID for hash computation (default: 84532 for Base Sepolia)

***

### escrowAddress?

> `optional` **escrowAddress**: `` `0x${string}` ``

Defined in: [arbiter/src/arbiter.ts:27](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L27)

Optional escrow contract address (defaults from network config)

***

### operatorAddress

> **operatorAddress**: `` `0x${string}` ``

Defined in: [arbiter/src/arbiter.ts:25](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L25)

PaymentOperator contract address

***

### publicClient

> **publicClient**: `object`

Defined in: [arbiter/src/arbiter.ts:21](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L21)

viem PublicClient for reading contract state

***

### refundRequestAddress?

> `optional` **refundRequestAddress**: `` `0x${string}` ``

Defined in: [arbiter/src/arbiter.ts:29](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L29)

Optional RefundRequest contract address (defaults from network config)

***

### walletClient

> **walletClient**: `object`

Defined in: [arbiter/src/arbiter.ts:23](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/arbiter.ts#L23)

viem WalletClient for write operations
