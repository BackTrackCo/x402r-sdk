import type { Address, Hash, Hex, WalletClient } from 'viem'
import { freezeAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface UnfreezePaymentParameters {
  freezeAddress: Address
  paymentInfo: PaymentInfo
  data?: Hex
}
export type UnfreezePaymentReturnType = Hash

export async function unfreezePayment(
  walletClient: WalletClient,
  parameters: UnfreezePaymentParameters,
): Promise<UnfreezePaymentReturnType> {
  const { freezeAddress, paymentInfo, data = '0x' } = parameters
  requireAccount(walletClient, 'unfreezePayment')

  return wrapContractCall('unfreezePayment', () =>
    walletClient.writeContract({
      address: freezeAddress,
      abi: freezeAbi,
      functionName: 'unfreeze',
      args: [paymentInfo, data],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
