import type { SettleResultContext } from '@x402/core/server'
import { X402rError } from '@x402r/core'
import { AUTH_CAPTURE_SCHEME } from '@x402r/evm'
import { reconstructPaymentInfoWire } from './reconstruct-payment-info.js'

export interface ForwardToArbiterOptions {
  /** Custom error handler. Defaults to `console.warn`. */
  onError?: (error: unknown) => void
}

/**
 * Creates an `onAfterSettle` hook that forwards the response body to an
 * arbiter service for evaluation. Fire-and-forget — does not block the
 * response to the client.
 *
 * Only fires for `auth-capture` scheme settlements (gated on the
 * `AUTH_CAPTURE_SCHEME` constant from `@x402r/evm`). Other schemes are
 * skipped. The hook reconstructs the JSON-form `PaymentInfoWire`
 * from the verified context and ships it as `paymentInfoWire` in the
 * POST body — arbiters consume `req.body.paymentInfoWire`, run it
 * through `PaymentInfo.fromWire` (from `@x402r/sdk` or `@x402r/core`)
 * to get bigints, and pass to SDK actions.
 *
 * POST body shape:
 * ```json
 * {
 *   "responseBody": "...",
 *   "transaction": "0x...",
 *   "paymentInfoWire": { ...PaymentInfoWire }
 * }
 * ```
 *
 * @example
 * ```ts
 * import { forwardToArbiter } from '@x402r/helpers'
 * import { AuthCaptureEvmScheme } from '@x402r/evm/auth-capture/server'
 *
 * const resourceServer = new x402ResourceServer(facilitatorClient)
 *   .register(networkId, new AuthCaptureEvmScheme())
 *   .onAfterSettle(
 *     forwardToArbiter('http://arbiter:3001', {
 *       onError: (err) => sentry.captureException(err),
 *     })
 *   )
 * ```
 */
export function forwardToArbiter(
  arbiterUrl: string,
  options?: ForwardToArbiterOptions,
): (context: SettleResultContext) => Promise<void> {
  const errorHandler =
    options?.onError ??
    ((err: unknown) => console.warn('[forwardToArbiter]', err))

  return async (context: SettleResultContext): Promise<void> => {
    if (!context.result.success) return
    if (context.requirements.scheme !== AUTH_CAPTURE_SCHEME) return

    const transportCtx = context.transportContext as
      | { responseBody?: { toString(encoding: string): string } }
      | undefined
    const responseBody = transportCtx?.responseBody
    if (!responseBody) return

    let paymentInfoWire: ReturnType<typeof reconstructPaymentInfoWire>
    try {
      paymentInfoWire = reconstructPaymentInfoWire(context)
    } catch (err) {
      errorHandler(
        new X402rError(`Arbiter request to ${arbiterUrl} skipped`, {
          cause: err instanceof Error ? err : undefined,
          details: 'reconstructPaymentInfoWire failed',
        }),
      )
      return
    }

    const url = new URL('/verify', arbiterUrl).toString()
    globalThis
      .fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseBody: responseBody.toString('utf-8'),
          transaction: context.result.transaction,
          paymentInfoWire,
        }),
      })
      .catch((err: unknown) =>
        errorHandler(
          new X402rError(`Arbiter request to ${arbiterUrl} failed`, {
            cause: err instanceof Error ? err : undefined,
            details: `POST ${url}`,
          }),
        ),
      )
  }
}
