import type { Address, Hash, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'
import { requireAccount, wrapContractCall } from './error-wrapping.js'

/**
 * Distributes accumulated fees for a token from the PaymentOperator.
 */
export async function distributeFees(
  walletClient: WalletClient,
  operatorAddress: Address,
  token: Address,
): Promise<Hash> {
  requireAccount(walletClient, 'distributeFees')

  return wrapContractCall('distributeFees', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'distributeFees',
      args: [token],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
