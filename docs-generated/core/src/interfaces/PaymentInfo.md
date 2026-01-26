[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / PaymentInfo

# Interface: PaymentInfo

Defined in: [core/src/types/index.ts:65](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L65)

PaymentInfo struct matching the Solidity struct from AuthCaptureEscrow

## Example

```typescript
const paymentInfo: PaymentInfo = {
  operator: '0x1234...',
  payer: '0x2345...',
  receiver: '0x3456...',
  token: '0x4567...',
  maxAmount: BigInt('1000000'),
  preApprovalExpiry: 0n,
  authorizationExpiry: BigInt(4294967295),
  refundExpiry: BigInt(281474976710655),
  minFeeBps: 0,
  maxFeeBps: 0,
  feeReceiver: '0x5678...',
  salt: BigInt('0x123456'),
};
```

## Properties

### authorizationExpiry

> **authorizationExpiry**: `bigint`

Defined in: [core/src/types/index.ts:79](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L79)

Authorization expiry timestamp (uint48 in Solidity)

***

### feeReceiver

> **feeReceiver**: `` `0x${string}` ``

Defined in: [core/src/types/index.ts:87](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L87)

Address that receives the fee

***

### maxAmount

> **maxAmount**: `bigint`

Defined in: [core/src/types/index.ts:75](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L75)

Maximum amount authorized (uint120 in Solidity)

***

### maxFeeBps

> **maxFeeBps**: `number`

Defined in: [core/src/types/index.ts:85](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L85)

Maximum fee in basis points (uint16 in Solidity)

***

### minFeeBps

> **minFeeBps**: `number`

Defined in: [core/src/types/index.ts:83](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L83)

Minimum fee in basis points (uint16 in Solidity)

***

### operator

> **operator**: `` `0x${string}` ``

Defined in: [core/src/types/index.ts:67](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L67)

Address of the operator contract (must match operator that authorized)

***

### payer

> **payer**: `` `0x${string}` ``

Defined in: [core/src/types/index.ts:69](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L69)

Address of the payer who authorized the payment

***

### preApprovalExpiry

> **preApprovalExpiry**: `bigint`

Defined in: [core/src/types/index.ts:77](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L77)

Pre-approval expiry timestamp (uint48 in Solidity, 0n if not used)

***

### receiver

> **receiver**: `` `0x${string}` ``

Defined in: [core/src/types/index.ts:71](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L71)

Address of the receiver (merchant)

***

### refundExpiry

> **refundExpiry**: `bigint`

Defined in: [core/src/types/index.ts:81](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L81)

Refund expiry timestamp (uint48 in Solidity)

***

### salt

> **salt**: `bigint`

Defined in: [core/src/types/index.ts:89](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L89)

Unique salt for this payment (uint256 in Solidity)

***

### token

> **token**: `` `0x${string}` ``

Defined in: [core/src/types/index.ts:73](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/types/index.ts#L73)

Address of the token being transferred (e.g., USDC)
