/**
 * @x402r/client - Client SDK for payers using X402r refundable payments
 *
 * @packageDocumentation
 */

// Client class
export { X402rClient, type X402rClientConfig } from "./client.js";

// Re-export types from core for convenience
export { PaymentState, RequestStatus, type PaymentInfo, type RefundRequestData } from "@x402r/core";
