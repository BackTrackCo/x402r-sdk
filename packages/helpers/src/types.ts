/**
 * Optional overrides for `refundable()`.
 *
 * When omitted the values are sourced from the chain config for the
 * option's network.
 */
export interface RefundableOptions {
  escrowAddress?: `0x${string}`
  tokenCollector?: `0x${string}`
  minFeeBps?: number
  maxFeeBps?: number
  settlementMethod?: 'authorize' | 'charge'
  postCaptureRefundDeadline?: number
}

/**
 * Loose x402 payment option — mirrors the wire format without importing
 * protocol-level types (which are not published as TS).
 */
export interface PaymentOption {
  scheme: string
  network: string
  payTo?: `0x${string}`
  price?: string
  asset?: `0x${string}`
  extra?: Record<string, unknown>
  [key: string]: unknown
}
