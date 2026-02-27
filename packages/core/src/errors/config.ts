import { X402rError, type X402rErrorArgs } from './base.js'

export class ConfigError extends X402rError {
  override name = 'ConfigError'

  constructor(shortMessage: string, args: X402rErrorArgs = {}) {
    super(shortMessage, {
      docsPath: '/sdk/config',
      ...args,
    })
  }
}
