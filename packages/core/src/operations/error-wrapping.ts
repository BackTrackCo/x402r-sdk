import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
} from 'viem'
import { ContractCallError } from '../errors/index.js'

export async function wrapContractCall<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof BaseError) {
      // Walk the viem error chain to extract rich context
      const revert = err.walk(
        (e) => e instanceof ContractFunctionRevertedError,
      ) as ContractFunctionRevertedError | null

      const execution = err.walk(
        (e) => e instanceof ContractFunctionExecutionError,
      ) as ContractFunctionExecutionError | null

      throw new ContractCallError(operation, {
        cause: err,
        contractAddress: execution?.contractAddress,
        details: revert ? getRevertDetails(revert) : err.shortMessage,
        metaMessages: revert ? getRevertMeta(revert) : undefined,
      })
    }
    throw err
  }
}

/** Extract a one-line details string from the decoded revert. */
function getRevertDetails(err: ContractFunctionRevertedError): string {
  // Error(string) or Panic(uint256) with decoded reason
  if (err.reason) return err.reason
  // Custom error decoded from ABI (e.g. "ConditionNotMet")
  if (err.data?.errorName) return err.data.errorName
  // Fallback
  return err.shortMessage
}

/** Extract metaMessages from decoded revert args if present. */
function getRevertMeta(
  err: ContractFunctionRevertedError,
): string[] | undefined {
  const meta: string[] = []
  if (err.data?.args?.length) {
    meta.push(`Args: (${err.data.args.map(String).join(', ')})`)
  }
  if (err.signature) {
    meta.push(`Selector: ${err.signature}`)
  }
  return meta.length ? meta : undefined
}
