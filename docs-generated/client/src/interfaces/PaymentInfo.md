[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [client/src](../README.md) / PaymentInfo

# Interface: PaymentInfo

Defined in: core/dist/types/index.d.ts:62

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

Defined in: core/dist/types/index.d.ts:76

Authorization expiry timestamp (uint48 in Solidity)

***

### feeReceiver

> **feeReceiver**: `` `0x${string}` ``

Defined in: core/dist/types/index.d.ts:84

Address that receives the fee

***

### maxAmount

> **maxAmount**: `bigint`

Defined in: core/dist/types/index.d.ts:72

Maximum amount authorized (uint120 in Solidity)

***

### maxFeeBps

> **maxFeeBps**: `number`

Defined in: core/dist/types/index.d.ts:82

Maximum fee in basis points (uint16 in Solidity)

***

### minFeeBps

> **minFeeBps**: `number`

Defined in: core/dist/types/index.d.ts:80

Minimum fee in basis points (uint16 in Solidity)

***

### operator

> **operator**: `` `0x${string}` ``

Defined in: core/dist/types/index.d.ts:64

Address of the operator contract (must match operator that authorized)

***

### payer

> **payer**: `` `0x${string}` ``

Defined in: core/dist/types/index.d.ts:66

Address of the payer who authorized the payment

***

### preApprovalExpiry

> **preApprovalExpiry**: `bigint`

Defined in: core/dist/types/index.d.ts:74

Pre-approval expiry timestamp (uint48 in Solidity, 0n if not used)

***

### receiver

> **receiver**: `` `0x${string}` ``

Defined in: core/dist/types/index.d.ts:68

Address of the receiver (merchant)

***

### refundExpiry

> **refundExpiry**: `bigint`

Defined in: core/dist/types/index.d.ts:78

Refund expiry timestamp (uint48 in Solidity)

***

### salt

> **salt**: `bigint`

Defined in: core/dist/types/index.d.ts:86

Unique salt for this payment (uint256 in Solidity)

***

### token

> **token**: `` `0x${string}` ``

Defined in: core/dist/types/index.d.ts:70

Address of the token being transferred (e.g., USDC)
