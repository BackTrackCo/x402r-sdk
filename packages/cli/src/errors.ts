export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6

export class CliError extends Error {
  readonly exitCode: ExitCode

  constructor(message: string, exitCode: ExitCode) {
    super(message)
    this.name = 'CliError'
    this.exitCode = exitCode
  }
}

export class NetworkError extends CliError {
  constructor(message: string) {
    super(message, 1)
    this.name = 'NetworkError'
  }
}

export class Malformed402Error extends CliError {
  constructor(message: string) {
    super(message, 2)
    this.name = 'Malformed402Error'
  }
}

export class MaxAmountExceededError extends CliError {
  constructor(message: string) {
    super(message, 3)
    this.name = 'MaxAmountExceededError'
  }
}

export class SignatureRejectedError extends CliError {
  constructor(message: string) {
    super(message, 4)
    this.name = 'SignatureRejectedError'
  }
}

export class SettlementError extends CliError {
  constructor(message: string) {
    super(message, 5)
    this.name = 'SettlementError'
  }
}
