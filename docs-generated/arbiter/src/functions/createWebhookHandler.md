[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [arbiter/src](../README.md) / createWebhookHandler

# Function: createWebhookHandler()

> **createWebhookHandler**(`config`): (`context`) => `Promise`\<[`WebhookResult`](../interfaces/WebhookResult.md)\>

Defined in: [arbiter/src/ai-hooks.ts:105](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/arbiter/src/ai-hooks.ts#L105)

Creates a webhook handler for processing refund cases with AI evaluation

This handler integrates with AI systems (like LLMs) to automatically
evaluate refund requests and optionally execute decisions.

## Parameters

### config

[`WebhookHandlerConfig`](../interfaces/WebhookHandlerConfig.md)

Configuration for the webhook handler

## Returns

A handler function that processes case evaluation contexts

> (`context`): `Promise`\<[`WebhookResult`](../interfaces/WebhookResult.md)\>

### Parameters

#### context

[`CaseEvaluationContext`](../interfaces/CaseEvaluationContext.md)

### Returns

`Promise`\<[`WebhookResult`](../interfaces/WebhookResult.md)\>

## Example

```typescript
import { X402rArbiter, createWebhookHandler } from '@x402r/arbiter';

const arbiter = new X402rArbiter({ ... });

const handler = createWebhookHandler({
  arbiter,
  evaluationHook: async (context) => {
    // Call your AI model here
    const response = await callLLM(context);
    return {
      decision: response.shouldRefund ? 'approve' : 'deny',
      reasoning: response.reasoning,
      confidence: response.confidence,
    };
  },
  autoExecute: true,
  confidenceThreshold: 0.9,
});

// Use in an Express route or webhook endpoint
app.post('/webhook/refund-request', async (req, res) => {
  const result = await handler(req.body);
  res.json(result);
});
```
