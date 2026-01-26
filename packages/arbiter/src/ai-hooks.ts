/**
 * AI integration hooks for automated dispute resolution
 * @module ai-hooks
 */

import type { PaymentInfo, PaymentState } from '@x402r/core';
import type { X402rArbiter } from './arbiter.js';

/**
 * Context provided to AI evaluation hooks for making decisions
 */
export interface CaseEvaluationContext {
  /** The payment information struct */
  paymentInfo: PaymentInfo;
  /** Current state of the payment */
  paymentState: PaymentState;
  /** Current status of the refund request */
  refundStatus: number;
  /** Hash of the payment info */
  paymentInfoHash: `0x${string}`;
  /** Optional evidence/metadata (if available) */
  evidence?: unknown;
}

/**
 * Result returned from an AI evaluation hook
 */
export interface DecisionResult {
  /** The decision: approve or deny the refund */
  decision: 'approve' | 'deny';
  /** Optional reasoning for the decision */
  reasoning?: string;
  /** Optional specific refund amount (for partial refunds) */
  refundAmount?: bigint;
  /** Optional confidence score (0-1) */
  confidence?: number;
}

/**
 * Hook function type for evaluating refund cases
 */
export type ArbiterHook = (context: CaseEvaluationContext) => Promise<DecisionResult>;

/**
 * Configuration for the webhook handler
 */
export interface WebhookHandlerConfig {
  /** The arbiter instance to use for decisions */
  arbiter: X402rArbiter;
  /** The evaluation hook function */
  evaluationHook: ArbiterHook;
  /** Whether to automatically execute the decision (default: false) */
  autoExecute?: boolean;
  /** Minimum confidence threshold for auto-execution (default: 0.8) */
  confidenceThreshold?: number;
}

/**
 * Result from the webhook handler
 */
export interface WebhookResult extends DecisionResult {
  /** Transaction hash if auto-executed */
  txHash?: `0x${string}`;
  /** Whether the decision was auto-executed */
  executed: boolean;
}

/**
 * Creates a webhook handler for processing refund cases with AI evaluation
 *
 * This handler integrates with AI systems (like LLMs) to automatically
 * evaluate refund requests and optionally execute decisions.
 *
 * @param config - Configuration for the webhook handler
 * @returns A handler function that processes case evaluation contexts
 *
 * @example
 * ```typescript
 * import { X402rArbiter, createWebhookHandler } from '@x402r/arbiter';
 *
 * const arbiter = new X402rArbiter({ ... });
 *
 * const handler = createWebhookHandler({
 *   arbiter,
 *   evaluationHook: async (context) => {
 *     // Call your AI model here
 *     const response = await callLLM(context);
 *     return {
 *       decision: response.shouldRefund ? 'approve' : 'deny',
 *       reasoning: response.reasoning,
 *       confidence: response.confidence,
 *     };
 *   },
 *   autoExecute: true,
 *   confidenceThreshold: 0.9,
 * });
 *
 * // Use in an Express route or webhook endpoint
 * app.post('/webhook/refund-request', async (req, res) => {
 *   const result = await handler(req.body);
 *   res.json(result);
 * });
 * ```
 */
export function createWebhookHandler(
  config: WebhookHandlerConfig
): (context: CaseEvaluationContext) => Promise<WebhookResult> {
  const { arbiter, evaluationHook, autoExecute = false, confidenceThreshold = 0.8 } = config;

  return async (context: CaseEvaluationContext): Promise<WebhookResult> => {
    // Evaluate the case using the provided hook
    const decision = await evaluationHook(context);

    const result: WebhookResult = {
      ...decision,
      executed: false,
    };

    // Auto-execute if enabled and confidence is above threshold
    if (autoExecute) {
      const confidence = decision.confidence ?? 1;
      if (confidence >= confidenceThreshold) {
        try {
          if (decision.decision === 'approve') {
            const { txHash } = await arbiter.approveRefund(context.paymentInfo);
            result.txHash = txHash;
            result.executed = true;
          } else {
            const { txHash } = await arbiter.denyRefund(context.paymentInfo);
            result.txHash = txHash;
            result.executed = true;
          }
        } catch {
          // If execution fails, still return the decision but mark as not executed
          result.executed = false;
        }
      }
    }

    return result;
  };
}
