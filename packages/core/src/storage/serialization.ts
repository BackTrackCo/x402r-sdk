/**
 * BigInt-safe JSON serialization for PaymentInfo structs.
 * @module storage/serialization
 */

import type { PaymentInfo } from "../types/index.js";

/** JSON-safe representation of PaymentInfo (bigint fields as strings) */
export interface SerializedPaymentInfo {
  operator: `0x${string}`;
  payer: `0x${string}`;
  receiver: `0x${string}`;
  token: `0x${string}`;
  maxAmount: string;
  preApprovalExpiry: string;
  authorizationExpiry: string;
  refundExpiry: string;
  minFeeBps: number;
  maxFeeBps: number;
  feeReceiver: `0x${string}`;
  salt: string;
}

/** Convert PaymentInfo to a JSON-serializable object (bigint → string) */
export function serializePaymentInfo(paymentInfo: PaymentInfo): SerializedPaymentInfo {
  return {
    operator: paymentInfo.operator,
    payer: paymentInfo.payer,
    receiver: paymentInfo.receiver,
    token: paymentInfo.token,
    maxAmount: paymentInfo.maxAmount.toString(),
    preApprovalExpiry: paymentInfo.preApprovalExpiry.toString(),
    authorizationExpiry: paymentInfo.authorizationExpiry.toString(),
    refundExpiry: paymentInfo.refundExpiry.toString(),
    minFeeBps: paymentInfo.minFeeBps,
    maxFeeBps: paymentInfo.maxFeeBps,
    feeReceiver: paymentInfo.feeReceiver,
    salt: paymentInfo.salt.toString(),
  };
}

/** Convert a serialized object back to PaymentInfo (string → bigint) */
export function deserializePaymentInfo(raw: SerializedPaymentInfo): PaymentInfo {
  return {
    operator: raw.operator,
    payer: raw.payer,
    receiver: raw.receiver,
    token: raw.token,
    maxAmount: BigInt(raw.maxAmount),
    preApprovalExpiry: BigInt(raw.preApprovalExpiry),
    authorizationExpiry: BigInt(raw.authorizationExpiry),
    refundExpiry: BigInt(raw.refundExpiry),
    minFeeBps: raw.minFeeBps,
    maxFeeBps: raw.maxFeeBps,
    feeReceiver: raw.feeReceiver,
    salt: BigInt(raw.salt),
  };
}
