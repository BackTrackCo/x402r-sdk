import type { SettleResultContext } from '@x402/core/server'

type ErrorHandler = (error: unknown) => void

interface ForwardToArbiterHook {
  (context: SettleResultContext): Promise<void>
  /** Set a custom error handler. Defaults to `console.warn`. */
  onError: (handler: ErrorHandler) => ForwardToArbiterHook
}

/**
 * Creates an `onAfterSettle` hook that forwards the response body to an
 * arbiter service for evaluation. Fire-and-forget — does not block the
 * response to the client.
 *
 * Only fires for escrow scheme settlements. Non-escrow schemes are skipped.
 *
 * @example
 * ```ts
 * import { forwardToArbiter } from '@x402r/helpers'
 *
 * const resourceServer = new x402ResourceServer(facilitatorClient)
 *   .register(networkId, new EscrowServerScheme())
 *   .onAfterSettle(
 *     forwardToArbiter('http://arbiter:3001')
 *       .onError((err) => sentry.captureException(err))
 *   )
 * ```
 */
export function forwardToArbiter(arbiterUrl: string): ForwardToArbiterHook {
  let errorHandler: ErrorHandler = (err) =>
    console.warn('[forwardToArbiter] failed:', err)

  const hook: ForwardToArbiterHook = Object.assign(
    async (context: SettleResultContext): Promise<void> => {
      if (!context.result.success) return
      if (context.requirements.scheme !== 'escrow') return

      const transportCtx = context.transportContext as
        | { responseBody?: { toString(encoding: string): string } }
        | undefined
      const responseBody = transportCtx?.responseBody
      if (!responseBody) return

      const url = new URL('/verify', arbiterUrl).toString()
      globalThis
        .fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseBody: responseBody.toString('utf-8'),
            network: context.requirements.network,
            transaction: context.result.transaction,
            scheme: 'escrow',
          }),
        })
        .catch(errorHandler)
    },
    {
      onError(handler: ErrorHandler) {
        errorHandler = handler
        return hook
      },
    },
  )

  return hook
}
