/**
 * Bridge utilities for converting x402 protocol types to x402r SDK types.
 *
 * @module bridge
 */

import type { PaymentInfo } from "@x402r/core/types";

/**
 * Shape of an EscrowPayload — uses structural typing so we don't depend on @x402r/evm.
 * Matches the EscrowPayload interface from @x402r/evm/escrow/types.
 */
export interface EscrowPayloadLike {
  authorization: { from: `0x${string}` };
  paymentInfo: {
    operator: `0x${string}`;
    receiver: `0x${string}`;
    token: `0x${string}`;
    maxAmount: string | bigint;
    preApprovalExpiry: string | number | bigint;
    authorizationExpiry: string | number | bigint;
    refundExpiry: string | number | bigint;
    minFeeBps: number;
    maxFeeBps: number;
    feeReceiver: `0x${string}`;
    salt: string | bigint;
  };
}

/**
 * Convert an EscrowPayload (from verified x402 payment) to a PaymentInfo struct.
 *
 * The EscrowPayload uses string/number types for on-wire JSON compatibility,
 * while PaymentInfo uses bigint for contract interaction. This bridges the two.
 *
 * @param escrowPayload - The EscrowPayload from a verified x402 payment (e.g. `verifiedPayload.payload`)
 * @returns A fully-typed PaymentInfo ready for SDK methods like `requestRefund`, `getPaymentState`, etc.
 *
 * @example
 * ```typescript
 * const escrowPayload = verifiedPayload.payload as EscrowPayload;
 * const paymentInfo = toPaymentInfo(escrowPayload);
 * // paymentInfo is ready for SDK methods like client.requestRefund(paymentInfo, ...)
 * ```
 */
export function toPaymentInfo(escrowPayload: EscrowPayloadLike): PaymentInfo {
  const pi = escrowPayload.paymentInfo;
  return {
    operator: pi.operator,
    payer: escrowPayload.authorization.from,
    receiver: pi.receiver,
    token: pi.token,
    maxAmount: BigInt(pi.maxAmount),
    preApprovalExpiry: BigInt(pi.preApprovalExpiry),
    authorizationExpiry: BigInt(pi.authorizationExpiry),
    refundExpiry: BigInt(pi.refundExpiry),
    minFeeBps: pi.minFeeBps,
    maxFeeBps: pi.maxFeeBps,
    feeReceiver: pi.feeReceiver,
    salt: BigInt(pi.salt),
  };
}
