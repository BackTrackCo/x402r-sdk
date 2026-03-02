import { X402rError, type X402rErrorArgs } from './base.js'

export class ContractCallError extends X402rError {
  override name = 'ContractCallError'
  revertName: string | undefined
  revertArgs: readonly unknown[] | undefined

  constructor(
    operation: string,
    args: X402rErrorArgs & {
      contractAddress?: string | undefined
      revertName?: string | undefined
      revertArgs?: readonly unknown[] | undefined
    } = {},
  ) {
    const metaMessages = [...(args.metaMessages ?? [])]
    if (args.contractAddress)
      metaMessages.push(`Contract: ${args.contractAddress}`)
    if (args.revertName) metaMessages.push(`Revert: ${args.revertName}`)

    super(`${operation} failed`, {
      ...args,
      metaMessages: metaMessages.length > 0 ? metaMessages : undefined,
    })
    this.revertName = args.revertName
    this.revertArgs = args.revertArgs
  }
}
