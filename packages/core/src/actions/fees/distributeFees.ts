import type { Address, Hash, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface DistributeFeesParameters {
  operatorAddress: Address
  token: Address
}
export type DistributeFeesReturnType = Hash

export async function distributeFees(
  walletClient: WalletClient,
  parameters: DistributeFeesParameters,
): Promise<DistributeFeesReturnType> {
  const { operatorAddress, token } = parameters
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
