import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface RefundPostEscrowParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  tokenCollector: Address
  collectorData: Hex
}
export type RefundPostEscrowReturnType = Hash

export async function refundPostEscrow(
  walletClient: WalletClient,
  parameters: RefundPostEscrowParameters,
): Promise<RefundPostEscrowReturnType> {
  const {
    operatorAddress,
    paymentInfo,
    amount,
    tokenCollector,
    collectorData,
  } = parameters
  requireAccount(walletClient, 'refundPostEscrow')

  return wrapContractCall('refundPostEscrow', () =>
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
