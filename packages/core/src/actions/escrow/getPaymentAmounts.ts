import type { Address, PublicClient } from 'viem'
import type { PaymentInfo } from '../../types/index.js'
import { getPaymentState } from './getPaymentState.js'
import type { PaymentAmounts } from './types.js'

export interface GetPaymentAmountsParameters {
  operatorAddress: Address
  chainId: number
  paymentInfo: PaymentInfo
}
export type GetPaymentAmountsReturnType = PaymentAmounts

export async function getPaymentAmounts(
  publicClient: PublicClient,
  parameters: GetPaymentAmountsParameters,
): Promise<GetPaymentAmountsReturnType> {
  const [hasCollectedPayment, capturableAmount, refundableAmount] =
    await getPaymentState(publicClient, parameters)
  return { hasCollectedPayment, capturableAmount, refundableAmount }
}
