/**
 * x402 Payment Middleware
 * Handles the HTTP 402 payment flow with verify and settle
 */

import type { Context, Next } from 'hono';
import { EscrowFacilitatorScheme, createFacilitatorSigner, type FacilitatorEvmSigner, type PaymentPayload, type PaymentRequirements } from '@x402r/evm/escrow/facilitator';

// Re-export for ease of use
export { EscrowFacilitatorScheme, createFacilitatorSigner };

export interface X402MiddlewareOptions {
  /** Payment requirements to return in 402 response */
  requirements: PaymentRequirements;
  /** EscrowFacilitatorScheme instance for verify/settle */
  facilitator: EscrowFacilitatorScheme;
}

/**
 * Create x402 payment middleware for Hono
 *
 * This middleware:
 * 1. Checks for X-Payment header
 * 2. If missing: returns 402 with payment requirements
 * 3. If present: verifies signature, settles on-chain, proceeds to handler
 */
export function x402Middleware(options: X402MiddlewareOptions) {
  const { requirements, facilitator } = options;

  return async (c: Context, next: Next) => {
    const paymentHeader = c.req.header('X-Payment');

    // No payment header - return 402 with requirements
    if (!paymentHeader) {
      console.log('[x402] No X-Payment header, returning 402');
      return c.json(
        {
          error: 'Payment Required',
          accepts: [requirements],
        },
        402
      );
    }

    // Parse payment payload
    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );
    } catch (error) {
      console.error('[x402] Failed to parse X-Payment header:', error);
      return c.json(
        {
          error: 'Invalid Payment',
          message: 'Failed to parse X-Payment header as base64 JSON',
          accepts: [requirements],
        },
        402
      );
    }

    console.log('[x402] Received payment payload from:', paymentPayload.payload?.authorization?.from);

    // Verify payment signature
    console.log('[x402] Verifying payment...');
    const verifyResult = await facilitator.verify(paymentPayload, requirements);

    if (!verifyResult.isValid) {
      console.error('[x402] Payment verification failed:', verifyResult.invalidReason);
      return c.json(
        {
          error: 'Invalid Payment',
          message: verifyResult.invalidReason,
          accepts: [requirements],
        },
        402
      );
    }

    console.log('[x402] Payment verified, payer:', verifyResult.payer);

    // Settle payment on-chain (calls authorize on the operator)
    console.log('[x402] Settling payment on-chain...');
    const settleResult = await facilitator.settle(paymentPayload, requirements);

    if (!settleResult.success) {
      console.error('[x402] Settlement failed:', settleResult.errorReason);
      return c.json(
        {
          error: 'Settlement Failed',
          message: settleResult.errorReason,
          accepts: [requirements],
        },
        402
      );
    }

    console.log('[x402] Payment settled! TX:', settleResult.transaction);

    // Store payment info in context for the handler
    c.set('x402', {
      payer: settleResult.payer,
      transaction: settleResult.transaction,
      paymentPayload,
    });

    // Continue to the actual handler
    await next();
  };
}
