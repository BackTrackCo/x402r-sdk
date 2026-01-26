[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [arbiter/src](../README.md) / DecisionResult

# Interface: DecisionResult

Defined in: [arbiter/src/ai-hooks.ts:28](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L28)

Result returned from an AI evaluation hook

## Extended by

- [`WebhookResult`](WebhookResult.md)

## Properties

### confidence?

> `optional` **confidence**: `number`

Defined in: [arbiter/src/ai-hooks.ts:36](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L36)

Optional confidence score (0-1)

***

### decision

> **decision**: `"approve"` \| `"deny"`

Defined in: [arbiter/src/ai-hooks.ts:30](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L30)

The decision: approve or deny the refund

***

### reasoning?

> `optional` **reasoning**: `string`

Defined in: [arbiter/src/ai-hooks.ts:32](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L32)

Optional reasoning for the decision

***

### refundAmount?

> `optional` **refundAmount**: `bigint`

Defined in: [arbiter/src/ai-hooks.ts:34](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L34)

Optional specific refund amount (for partial refunds)
