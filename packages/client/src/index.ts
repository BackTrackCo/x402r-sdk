/**
 * @x402r/client - Client SDK for payers using X402r refundable payments
 *
 * @packageDocumentation
 */

// Client class
export { X402rClient, type X402rClientConfig } from "./client.js";

// Re-export types from core for convenience
export {
  PaymentState,
  RequestStatus,
  type PaymentInfo,
  type PaymentStore,
  type RefundRequestData,
} from "@x402r/core";

// Re-export storage implementations for convenience
export { MemoryPaymentStore, FilePaymentStore } from "@x402r/core";
