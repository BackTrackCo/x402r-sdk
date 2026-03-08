import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface ChargeParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  tokenCollector: Address
  collectorData: Hex
}
export type ChargeReturnType = Hash

export async function charge(
  walletClient: WalletClient,
  parameters: ChargeParameters,
): Promise<ChargeReturnType> {
  const {
    operatorAddress,
    paymentInfo,
    amount,
    tokenCollector,
    collectorData,
  } = parameters
  requireAccount(walletClient, 'charge')

  return wrapContractCall('charge', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'charge',
      args: [paymentInfo, amount, tokenCollector, collectorData],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
