import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  type WalletClient,
} from 'viem'
import { ContractCallError } from '../../errors/index.js'

export function requireAccount(
  walletClient: WalletClient,
  opName: string,
): asserts walletClient is WalletClient & {
  account: NonNullable<WalletClient['account']>
} {
  if (!walletClient.account) {
    throw new ContractCallError(opName, {
      details: 'walletClient must have an account attached',
    })
  }
}

export async function wrapContractCall<T>(
  opName: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (!(error instanceof BaseError)) throw error

    const revert = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | null
    const contractAddress =
      error instanceof ContractFunctionExecutionError
        ? error.contractAddress
        : undefined

    if (revert) {
      throw new ContractCallError(opName, {
        cause: revert,
        details: revert.reason ?? revert.shortMessage,
        revertName: revert.data?.errorName,
        revertArgs: revert.data?.args as readonly unknown[] | undefined,
        contractAddress,
      })
    }

    throw new ContractCallError(opName, {
      cause: error,
      details: error.details || error.shortMessage,
      contractAddress,
    })
  }
}
