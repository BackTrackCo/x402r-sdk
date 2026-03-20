import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import {
  requireAccount,
  wrapContractCall,
} from '../_internal/error-wrapping.js'

export interface AuthorizeParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  tokenCollector: Address
  collectorData: Hex
}
export type AuthorizeReturnType = Hash

/**
 * Collects tokens into escrow. Use `release()` to claim after the escrow period.
 * Mutually exclusive with `charge()` on the same paymentInfo — calling both reverts
 * with `PaymentAlreadyCollected`.
 */
export async function authorize(
  walletClient: WalletClient,
  parameters: AuthorizeParameters,
): Promise<AuthorizeReturnType> {
  const {
    operatorAddress,
    paymentInfo,
    amount,
    tokenCollector,
    collectorData,
  } = parameters
  requireAccount(walletClient, 'authorize')

  return wrapContractCall('authorize', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'authorize',
      args: [paymentInfo, amount, tokenCollector, collectorData],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
