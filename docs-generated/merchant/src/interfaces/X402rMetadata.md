[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [merchant/src](../README.md) / X402rMetadata

# Interface: X402rMetadata

Defined in: [merchant/src/helpers.ts:9](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/helpers.ts#L9)

X402r extension metadata for refundable payments

## Properties

### escrowPeriod?

> `optional` **escrowPeriod**: `number`

Defined in: [merchant/src/helpers.ts:13](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/helpers.ts#L13)

Escrow period in seconds (optional)

***

### operator

> **operator**: `` `0x${string}` ``

Defined in: [merchant/src/helpers.ts:11](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/helpers.ts#L11)

PaymentOperator contract address

***

### refundRequestAddress?

> `optional` **refundRequestAddress**: `` `0x${string}` ``

Defined in: [merchant/src/helpers.ts:15](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/merchant/src/helpers.ts#L15)

RefundRequest contract address (optional)
