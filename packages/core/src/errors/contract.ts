import { X402rError, type X402rErrorArgs } from './base.js'

export class ContractCallError extends X402rError {
  override name = 'ContractCallError'

  constructor(
    operation: string,
    args: X402rErrorArgs & { contractAddress?: string | undefined } = {},
  ) {
    const metaMessages = [...(args.metaMessages ?? [])]
    if (args.contractAddress) {
      metaMessages.push(`Contract: ${args.contractAddress}`)
    }

    super(`${operation} failed`, {
      ...args,
      metaMessages,
    })
  }
}
