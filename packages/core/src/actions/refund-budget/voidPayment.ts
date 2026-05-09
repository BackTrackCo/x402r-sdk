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
 * it empties the authorization in one transaction.
 *
 * For partial in-escrow refunds, use partial capture: `capture(merchantAmount)`
 * then `voidPayment()` to return the remainder to the payer (no allowance,
 * no `ReceiverRefundCollector`). For post-capture refunds, use `refund()` with
 * a pre-staked `ReceiverRefundCollector` allowance via `approveRefundAllowance()`.
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
