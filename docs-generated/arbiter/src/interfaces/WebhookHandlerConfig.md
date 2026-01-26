[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [arbiter/src](../README.md) / WebhookHandlerConfig

# Interface: WebhookHandlerConfig

Defined in: [arbiter/src/ai-hooks.ts:47](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L47)

Configuration for the webhook handler

## Properties

### arbiter

> **arbiter**: [`X402rArbiter`](../classes/X402rArbiter.md)

Defined in: [arbiter/src/ai-hooks.ts:49](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L49)

The arbiter instance to use for decisions

***

### autoExecute?

> `optional` **autoExecute**: `boolean`

Defined in: [arbiter/src/ai-hooks.ts:53](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L53)

Whether to automatically execute the decision (default: false)

***

### confidenceThreshold?

> `optional` **confidenceThreshold**: `number`

Defined in: [arbiter/src/ai-hooks.ts:55](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L55)

Minimum confidence threshold for auto-execution (default: 0.8)

***

### evaluationHook

> **evaluationHook**: [`ArbiterHook`](../type-aliases/ArbiterHook.md)

Defined in: [arbiter/src/ai-hooks.ts:51](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L51)

The evaluation hook function
