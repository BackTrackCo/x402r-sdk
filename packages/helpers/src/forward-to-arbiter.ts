// Node 18+ has fetch globally; declare it for TS with ES2022 lib
declare function fetch(
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<{ ok: boolean }>

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
 *   .onAfterSettle(forwardToArbiter('http://arbiter:3001'))
 * ```
 */
export function forwardToArbiter(arbiterUrl: string) {
  return async (context: {
    result: { success: boolean; transaction: string; network: string }
    requirements: { scheme: string; network: string }
    transportContext?: unknown
  }): Promise<void> => {
    if (!context.result.success) return
    if (context.requirements.scheme !== 'escrow') return

    const transportCtx = context.transportContext as
      | { responseBody?: { toString(encoding: string): string } }
      | undefined
    const responseBody = transportCtx?.responseBody
    if (!responseBody) return

    fetch(`${arbiterUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responseBody: responseBody.toString('utf-8'),
        network: context.requirements.network,
        transaction: context.result.transaction,
        scheme: 'escrow',
      }),
    }).catch(() => {})
  }
}
