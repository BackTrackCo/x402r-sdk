import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
} from 'viem'
import { ContractCallError } from '../errors/index.js'

export async function wrapContractCall<T>(
  opName: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (!(error instanceof BaseError)) throw error

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    const execError = error.walk(
      (e) => e instanceof ContractFunctionExecutionError,
    ) as ContractFunctionExecutionError | null
    const contractAddress = execError?.contractAddress

    if (revert instanceof ContractFunctionRevertedError) {
      throw new ContractCallError(opName, {
        cause: revert,
        details: revert.shortMessage,
        revertName: revert.data?.errorName,
        revertArgs: revert.data?.args as readonly unknown[] | undefined,
        ...(contractAddress && { contractAddress }),
      })
    }

    throw new ContractCallError(opName, {
      cause: error,
      details: error.shortMessage,
      ...(contractAddress && { contractAddress }),
    })
  }
}
