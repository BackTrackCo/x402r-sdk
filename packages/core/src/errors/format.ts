import { X402rError } from './base.js'

/**
 * Flatten any thrown value to a human-readable string.
 *
 * @example
 * try { await capture(client, args) } catch (err) { console.error(formatError(err)) }
 */
export function formatError(err: unknown): string {
  if (err instanceof X402rError) return err.message
  if (
    err !== null &&
    typeof err === 'object' &&
    'shortMessage' in err &&
    typeof (err as { shortMessage: unknown }).shortMessage === 'string'
  ) {
    return (err as { shortMessage: string }).shortMessage
  }
  if (err instanceof Error) return err.message
  return String(err)
}
