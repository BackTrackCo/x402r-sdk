[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [arbiter/src](../README.md) / CaseEvaluationContext

# Interface: CaseEvaluationContext

Defined in: [arbiter/src/ai-hooks.ts:12](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L12)

Context provided to AI evaluation hooks for making decisions

## Properties

### evidence?

> `optional` **evidence**: `unknown`

Defined in: [arbiter/src/ai-hooks.ts:22](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L22)

Optional evidence/metadata (if available)

***

### paymentInfo

> **paymentInfo**: [`PaymentInfo`](../../../client/src/interfaces/PaymentInfo.md)

Defined in: [arbiter/src/ai-hooks.ts:14](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L14)

The payment information struct

***

### paymentInfoHash

> **paymentInfoHash**: `` `0x${string}` ``

Defined in: [arbiter/src/ai-hooks.ts:20](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L20)

Hash of the payment info

***

### paymentState

> **paymentState**: [`PaymentState`](../../../client/src/enumerations/PaymentState.md)

Defined in: [arbiter/src/ai-hooks.ts:16](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L16)

Current state of the payment

***

### refundStatus

> **refundStatus**: `number`

Defined in: [arbiter/src/ai-hooks.ts:18](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L18)

Current status of the refund request
