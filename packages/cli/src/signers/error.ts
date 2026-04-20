import { CliError } from '../errors.js'

export class SignerResolutionError extends CliError {
  constructor(message: string) {
    super(message, 6)
    this.name = 'SignerResolutionError'
  }
}
