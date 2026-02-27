import { X402rError, type X402rErrorArgs } from './base.js'

export class ValidationError extends X402rError {
  override name = 'ValidationError'

  constructor(shortMessage: string, args: X402rErrorArgs = {}) {
    super(shortMessage, {
      docsPath: '/sdk/validation',
      ...args,
    })
  }
}
