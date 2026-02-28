import { X402rError, type X402rErrorArgs } from './base.js'

export class NotImplementedError extends X402rError {
  override name = 'NotImplementedError'

  constructor(method: string, args: X402rErrorArgs = {}) {
    super(`${method} is not implemented`, {
      docsPath: '/sdk/roadmap',
      ...args,
    })
  }
}
