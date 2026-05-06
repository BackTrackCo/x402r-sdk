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
  // `amount` is accepted for back-compat but ignored: the new escrow `void()` is
  // full-only — it empties the entire authorization regardless of any partial
  // amount the caller passes. See plans/AUTHCAPTURE_SDK_MIGRATION.md (R-25).
  const {
    operatorAddress,
    paymentInfo,
    amount: _amount,
    data = '0x',
  } = parameters
  requireAccount(walletClient, 'refundInEscrow')

  return wrapContractCall('refundInEscrow', () =>
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
