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

/**
 * Direct charge — collects and immediately distributes tokens to the receiver.
 * No escrow hold. Mutually exclusive with `authorize()` on the same paymentInfo —
 * calling both reverts with `PaymentAlreadyCollected`.
 */
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
      // Operator `charge` mirrors the escrow's 6-arg selector. The two trailing
      // fee args are constrained: the operator ignores `feeBps` and recomputes
      // the rate internally (so `minFeeBps` is a safe in-range placeholder), and
      // it forwards `feeReceiver` to the escrow, which requires it to equal
      // `paymentInfo.feeReceiver`.
      args: [
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
        paymentInfo.minFeeBps,
        paymentInfo.feeReceiver,
      ],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
