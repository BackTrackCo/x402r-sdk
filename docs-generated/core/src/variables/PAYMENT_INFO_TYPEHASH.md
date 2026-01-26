[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / PAYMENT\_INFO\_TYPEHASH

# Variable: PAYMENT\_INFO\_TYPEHASH

> `const` **PAYMENT\_INFO\_TYPEHASH**: `` `0x${string}` ``

Defined in: [core/src/utils/index.ts:14](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/utils/index.ts#L14)

EIP-712 typehash for PaymentInfo struct

Computed as: keccak256("PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)")
