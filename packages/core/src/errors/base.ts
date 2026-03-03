declare const __VERSION__: string
const version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0'
const docsBaseUrl = 'https://docs.x402r.org'

export type X402rErrorArgs = {
  cause?: Error | undefined
  details?: string | undefined
  docsPath?: string | undefined
  metaMessages?: string[] | undefined
}

export class X402rError extends Error {
  override name = 'X402rError'

  details: string | undefined
  docsPath: string | undefined
  metaMessages: string[] | undefined
  shortMessage: string

  constructor(shortMessage: string, args: X402rErrorArgs = {}) {
    const message = (() => {
      const lines = [shortMessage]

      if (args.metaMessages?.length) {
        lines.push('', ...args.metaMessages)
      }
      if (args.docsPath) {
        lines.push('', `Docs: ${docsBaseUrl}${args.docsPath}`)
      }
      if (args.details) {
        lines.push('', `Details: ${args.details}`)
      }
      lines.push('', `Version: @x402r/core@${version}`)

      return lines.join('\n')
    })()

    super(message, args.cause ? { cause: args.cause } : undefined)

    this.details = args.details
    this.docsPath = args.docsPath
    this.metaMessages = args.metaMessages
    this.shortMessage = shortMessage
  }

  walk(): Error
  walk(fn: (err: Error) => boolean): Error | null
  walk(fn?: (err: Error) => boolean): Error | null {
    return walk(this, fn)
  }
}

function walk(err: Error, fn?: (err: Error) => boolean): Error | null {
  if (fn?.(err)) return err

  if (err.cause instanceof Error) {
    return walk(err.cause, fn)
  }

  return fn ? null : err
}
