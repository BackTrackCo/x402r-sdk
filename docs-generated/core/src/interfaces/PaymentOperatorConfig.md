[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / PaymentOperatorConfig

# Interface: PaymentOperatorConfig

Defined in: [core/src/factory/index.ts:25](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L25)

Configuration for deploying a PaymentOperator via the factory

## Example

```typescript
const config: PaymentOperatorConfig = {
  feeRecipient: '0x...',
  authorizeCondition: '0x0000000000000000000000000000000000000000',
  // ... other fields default to zero address
};
```

## Properties

### authorizeCondition

> **authorizeCondition**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:29](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L29)

Condition to check before authorize (address(0) = always allow)

***

### authorizeRecorder

> **authorizeRecorder**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:31](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L31)

Recorder to call after authorize (address(0) = no-op)

***

### chargeCondition

> **chargeCondition**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:33](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L33)

Condition to check before charge (address(0) = always allow)

***

### chargeRecorder

> **chargeRecorder**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:35](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L35)

Recorder to call after charge (address(0) = no-op)

***

### feeRecipient

> **feeRecipient**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:27](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L27)

Address to receive operator fees

***

### refundInEscrowCondition

> **refundInEscrowCondition**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:41](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L41)

Condition to check before refundInEscrow (address(0) = always allow)

***

### refundInEscrowRecorder

> **refundInEscrowRecorder**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:43](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L43)

Recorder to call after refundInEscrow (address(0) = no-op)

***

### refundPostEscrowCondition

> **refundPostEscrowCondition**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:45](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L45)

Condition to check before refundPostEscrow (address(0) = always allow)

***

### refundPostEscrowRecorder

> **refundPostEscrowRecorder**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:47](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L47)

Recorder to call after refundPostEscrow (address(0) = no-op)

***

### releaseCondition

> **releaseCondition**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:37](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L37)

Condition to check before release (address(0) = always allow)

***

### releaseRecorder

> **releaseRecorder**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:39](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L39)

Recorder to call after release (address(0) = no-op)
