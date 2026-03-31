import {
  deserializePaymentInfo,
  type PaymentInfo,
  type SerializedPaymentInfo,
  ValidationError,
} from '@x402r/core'

/**
 * Parsed result from an arbiter-side forwarded payload.
 *
 * Mirrors the JSON body sent by {@link forwardToArbiter}.
 */
export interface ParsedForwardedPayload {
  /** The raw HTTP response body from the resource server (parsed JSON or string). */
  responseBody: unknown
  /** Deserialized PaymentInfo with BigInt fields restored. */
  paymentInfo: PaymentInfo
  /** CAIP-2 network identifier (e.g. `"eip155:84532"`). */
  network: string
  /** Settlement transaction hash. */
  transaction: string
}

/**
 * Parses the JSON body that {@link forwardToArbiter} POSTs to the arbiter's
 * `/verify` endpoint.
 *
 * Extracts `paymentInfo` from `paymentPayload.payload.paymentInfo` and
 * converts BigInt-serialized fields (`maxAmount`, `salt`) back to native
 * `bigint` values.
 *
 * @example
 * ```ts
 * import { parseForwardedPayload } from '@x402r/helpers'
 *
 * app.post('/verify', async (req, res) => {
 *   const { responseBody, paymentInfo, network, transaction } =
 *     parseForwardedPayload(req.body)
 *   // paymentInfo.maxAmount is bigint
 * })
 * ```
 */
export function parseForwardedPayload(body: unknown): ParsedForwardedPayload {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Expected an object as the forwarded payload')
  }

  const obj = body as Record<string, unknown>

  const transaction = obj.transaction
  if (typeof transaction !== 'string' || !transaction) {
    throw new ValidationError(
      'Missing or invalid "transaction" in forwarded payload',
    )
  }

  const paymentPayload = obj.paymentPayload
  if (!paymentPayload || typeof paymentPayload !== 'object') {
    throw new ValidationError(
      'Missing or invalid "paymentPayload" in forwarded payload',
    )
  }

  const pp = paymentPayload as Record<string, unknown>
  const accepted = pp.accepted as Record<string, unknown> | undefined
  const network =
    typeof accepted?.network === 'string' ? accepted.network : undefined
  if (!network) {
    throw new ValidationError(
      'Missing "paymentPayload.accepted.network" in forwarded payload',
    )
  }

  const payload = pp.payload as Record<string, unknown> | undefined
  const rawPaymentInfo = payload?.paymentInfo as
    | SerializedPaymentInfo
    | undefined
  if (!rawPaymentInfo || typeof rawPaymentInfo !== 'object') {
    throw new ValidationError(
      'Missing "paymentPayload.payload.paymentInfo" in forwarded payload',
    )
  }

  const paymentInfo = deserializePaymentInfo(rawPaymentInfo)

  // responseBody is a stringified JSON string; attempt to parse it
  let responseBody: unknown = obj.responseBody
  if (typeof responseBody === 'string') {
    try {
      responseBody = JSON.parse(responseBody)
    } catch {
      // keep as raw string if not valid JSON
    }
  }

  return { responseBody, paymentInfo, network, transaction }
}
