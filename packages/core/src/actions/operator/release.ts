import type { Address, Hash, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ReleaseParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
}
export type ReleaseReturnType = Hash

export async function release(
  walletClient: WalletClient,
  parameters: ReleaseParameters,
): Promise<ReleaseReturnType> {
  const { operatorAddress, paymentInfo, amount } = parameters
  requireAccount(walletClient, 'release')

  return wrapContractCall('release', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'release',
      args: [paymentInfo, amount],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
