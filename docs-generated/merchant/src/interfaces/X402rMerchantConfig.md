[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [merchant/src](../README.md) / X402rMerchantConfig

# Interface: X402rMerchantConfig

Defined in: [merchant/src/merchant.ts:21](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L21)

Configuration for X402rMerchant

## Properties

### chainId?

> `optional` **chainId**: `number`

Defined in: [merchant/src/merchant.ts:33](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L33)

Chain ID for hash computation (default: 84532 for Base Sepolia)

***

### escrowAddress?

> `optional` **escrowAddress**: `` `0x${string}` ``

Defined in: [merchant/src/merchant.ts:29](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L29)

Optional escrow contract address (defaults from network config)

***

### operatorAddress

> **operatorAddress**: `` `0x${string}` ``

Defined in: [merchant/src/merchant.ts:27](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L27)

PaymentOperator contract address

***

### publicClient

> **publicClient**: `object`

Defined in: [merchant/src/merchant.ts:23](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L23)

viem PublicClient for reading contract state

***

### refundRequestAddress?

> `optional` **refundRequestAddress**: `` `0x${string}` ``

Defined in: [merchant/src/merchant.ts:31](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L31)

Optional RefundRequest contract address (defaults from network config)

***

### walletClient

> **walletClient**: `object`

Defined in: [merchant/src/merchant.ts:25](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/merchant.ts#L25)

viem WalletClient for write operations (required for merchants)
