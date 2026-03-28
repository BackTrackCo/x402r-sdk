import type { Address, Hash, Hex, WalletClient } from 'viem'
import { freezeAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface FreezePaymentParameters {
  freezeAddress: Address
  paymentInfo: PaymentInfo
  data?: Hex
}
export type FreezePaymentReturnType = Hash

export async function freezePayment(
  walletClient: WalletClient,
  parameters: FreezePaymentParameters,
): Promise<FreezePaymentReturnType> {
  const { freezeAddress, paymentInfo, data = '0x' } = parameters
  requireAccount(walletClient, 'freezePayment')

  return wrapContractCall('freezePayment', () =>
    walletClient.writeContract({
      address: freezeAddress,
      abi: freezeAbi,
      functionName: 'freeze',
      args: [paymentInfo, data],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
