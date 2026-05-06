import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface VoidPaymentParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  data?: Hex
}
export type VoidPaymentReturnType = Hash

/**
 * Void the entire authorization. The on-chain `escrow.void()` is full-only —
 * it empties the authorization in one transaction. For partial refunds, use
 * capture-then-refund via ReceiverRefundCollector instead.
 */
export async function voidPayment(
  walletClient: WalletClient,
  parameters: VoidPaymentParameters,
): Promise<VoidPaymentReturnType> {
  const { operatorAddress, paymentInfo, data = '0x' } = parameters
  requireAccount(walletClient, 'voidPayment')

  return wrapContractCall('voidPayment', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'void',
      args: [paymentInfo, data],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
