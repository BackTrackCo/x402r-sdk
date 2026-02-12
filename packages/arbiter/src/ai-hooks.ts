/**
 * AI integration hooks for automated dispute resolution
 * @module ai-hooks
 */

import type { PaymentInfo, PaymentState, Evidence, IpfsConfig } from "@x402r/core";
import { getAllEvidence, fetchFromIpfs } from "@x402r/core";
import type { X402rArbiter } from "./arbiter.js";

/**
 * Context provided to AI evaluation hooks for making decisions
 */
export interface CaseEvaluationContext {
  /** The payment information struct */
  paymentInfo: PaymentInfo;
  /** The record index (nonce) identifying which charge this refund is for */
  nonce: bigint;
  /** Current state of the payment */
  paymentState: PaymentState;
  /** Current status of the refund request */
  refundStatus: number;
  /** Hash of the payment info */
  paymentInfoHash: `0x${string}`;
  /** Amount being requested for refund */
  refundAmount?: bigint;
  /** On-chain evidence entries for this dispute */
  evidence?: Evidence[];
  /** Fetched IPFS content for each evidence entry (parallel to evidence array) */
  evidenceContent?: unknown[];
}

/**
 * Result returned from an AI evaluation hook
 */
export interface DecisionResult {
  /** The decision: approve or deny the refund */
  decision: "approve" | "deny";
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
  /** Whether to automatically submit the approve/deny decision on-chain (default: false).
   *  Note: this submits the decision only — executing the actual refund transfer is a separate step. */
  autoSubmitDecision?: boolean;
  /** Minimum confidence threshold for auto-execution (default: 0.8) */
  confidenceThreshold?: number;
  /** Whether to fetch on-chain evidence and IPFS content before evaluation (default: false) */
  fetchEvidence?: boolean;
  /** IPFS configuration for evidence fetching */
  ipfsConfig?: IpfsConfig;
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
 *   autoSubmitDecision: true,
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
  config: WebhookHandlerConfig,
): (context: CaseEvaluationContext) => Promise<WebhookResult> {
  const {
    arbiter,
    evaluationHook,
    autoSubmitDecision = false,
    confidenceThreshold = 0.8,
    fetchEvidence: shouldFetchEvidence = false,
    ipfsConfig,
  } = config;

  return async (context: CaseEvaluationContext): Promise<WebhookResult> => {
    // Fetch on-chain evidence and IPFS content if configured
    if (shouldFetchEvidence && arbiter.refundRequestEvidenceAddress) {
      const evidenceCtx = {
        publicClient: arbiter.publicClient,
        refundRequestEvidenceAddress: arbiter.refundRequestEvidenceAddress,
      };

      const entries = await getAllEvidence(evidenceCtx, context.paymentInfo, context.nonce);
      context.evidence = entries;

      const content = await Promise.all(
        entries.map(async e => {
          try {
            return await fetchFromIpfs(e.cid, ipfsConfig);
          } catch {
            return null;
          }
        }),
      );
      context.evidenceContent = content;
    }

    // Evaluate the case using the provided hook
    const decision = await evaluationHook(context);

    const result: WebhookResult = {
      ...decision,
      executed: false,
    };

    // Auto-submit decision on-chain if enabled and confidence is above threshold
    if (autoSubmitDecision) {
      const confidence = decision.confidence ?? 1;
      if (confidence >= confidenceThreshold) {
        try {
          if (decision.decision === "approve") {
            const { txHash } = await arbiter.approveRefundRequest(
              context.paymentInfo,
              context.nonce,
            );
            result.txHash = txHash;
            result.executed = true;
          } else {
            const { txHash } = await arbiter.denyRefundRequest(context.paymentInfo, context.nonce);
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
