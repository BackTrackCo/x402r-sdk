import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface RefundInEscrowParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  data?: Hex
}
export type RefundInEscrowReturnType = Hash

export async function refundInEscrow(
  walletClient: WalletClient,
  parameters: RefundInEscrowParameters,
): Promise<RefundInEscrowReturnType> {
  const { operatorAddress, paymentInfo, amount, data = '0x' } = parameters
  requireAccount(walletClient, 'refundInEscrow')

  return wrapContractCall('refundInEscrow', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'refundInEscrow',
      args: [paymentInfo, amount, data],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
