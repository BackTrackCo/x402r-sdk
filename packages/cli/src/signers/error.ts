export class SignerResolutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignerResolutionError'
  }
}
