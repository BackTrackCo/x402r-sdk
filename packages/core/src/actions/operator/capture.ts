import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface CaptureParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  data?: Hex
}
export type CaptureReturnType = Hash

export async function capture(
  walletClient: WalletClient,
  parameters: CaptureParameters,
): Promise<CaptureReturnType> {
  const { operatorAddress, paymentInfo, amount, data = '0x' } = parameters
  requireAccount(walletClient, 'capture')

  return wrapContractCall('capture', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'capture',
      args: [paymentInfo, amount, data],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
