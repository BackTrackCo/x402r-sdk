[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / computePaymentInfoHash

# Function: computePaymentInfoHash()

> **computePaymentInfoHash**(`paymentInfo`, `escrowAddress`, `chainId`): `` `0x${string}` ``

Defined in: [core/src/utils/index.ts:75](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/utils/index.ts#L75)

Compute the payment info hash as used by the escrow contract

The hash is computed in two steps:
1. Hash the PaymentInfo struct with its typehash
2. Hash the result with chainId and escrow address

This matches the Solidity implementation:
```solidity
bytes32 paymentInfoHash = keccak256(abi.encode(PAYMENT_INFO_TYPEHASH, paymentInfo));
return keccak256(abi.encode(block.chainid, address(this), paymentInfoHash));
```

## Parameters

### paymentInfo

[`PaymentInfo`](../interfaces/PaymentInfo.md)

The payment information struct

### escrowAddress

`` `0x${string}` ``

The escrow contract address

### chainId

`number`

The chain ID (e.g., 84532 for Base Sepolia)

## Returns

`` `0x${string}` ``

The bytes32 hash

## Example

```typescript
const hash = computePaymentInfoHash(
  paymentInfo,
  '0xb33D6502EdBbC47201cd1E53C49d703EC0a660b8',
  84532
);
```
