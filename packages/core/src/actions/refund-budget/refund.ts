import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface RefundParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  tokenCollector: Address
  collectorData: Hex
}
export type RefundReturnType = Hash

/**
 * Refund a captured payment back to the payer. Pulls tokens from the source
 * the `tokenCollector` is wired to (typically the merchant via
 * ReceiverRefundCollector). For full-void during escrow, use `voidPayment`
 * instead.
 */
export async function refund(
  walletClient: WalletClient,
  parameters: RefundParameters,
): Promise<RefundReturnType> {
  const {
    operatorAddress,
    paymentInfo,
    amount,
    tokenCollector,
    collectorData,
  } = parameters
  requireAccount(walletClient, 'refund')

  return wrapContractCall('refund', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'refund',
      args: [paymentInfo, amount, tokenCollector, collectorData],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
