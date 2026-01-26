[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [arbiter/src](../README.md) / WebhookResult

# Interface: WebhookResult

Defined in: [arbiter/src/ai-hooks.ts:61](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L61)

Result from the webhook handler

## Extends

- [`DecisionResult`](DecisionResult.md)

## Properties

### confidence?

> `optional` **confidence**: `number`

Defined in: [arbiter/src/ai-hooks.ts:36](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L36)

Optional confidence score (0-1)

#### Inherited from

[`DecisionResult`](DecisionResult.md).[`confidence`](DecisionResult.md#confidence)

***

### decision

> **decision**: `"approve"` \| `"deny"`

Defined in: [arbiter/src/ai-hooks.ts:30](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L30)

The decision: approve or deny the refund

#### Inherited from

[`DecisionResult`](DecisionResult.md).[`decision`](DecisionResult.md#decision)

***

### executed

> **executed**: `boolean`

Defined in: [arbiter/src/ai-hooks.ts:65](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L65)

Whether the decision was auto-executed

***

### reasoning?

> `optional` **reasoning**: `string`

Defined in: [arbiter/src/ai-hooks.ts:32](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L32)

Optional reasoning for the decision

#### Inherited from

[`DecisionResult`](DecisionResult.md).[`reasoning`](DecisionResult.md#reasoning)

***

### refundAmount?

> `optional` **refundAmount**: `bigint`

Defined in: [arbiter/src/ai-hooks.ts:34](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L34)

Optional specific refund amount (for partial refunds)

#### Inherited from

[`DecisionResult`](DecisionResult.md).[`refundAmount`](DecisionResult.md#refundamount)

***

### txHash?

> `optional` **txHash**: `` `0x${string}` ``

Defined in: [arbiter/src/ai-hooks.ts:63](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L63)

Transaction hash if auto-executed
