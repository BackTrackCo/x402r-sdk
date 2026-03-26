import type { ConditionSlot, PaymentInfo } from '@x402r/core'
import { getConditionAddress, iConditionAbi } from '@x402r/core'
import { BaseError, type Hex, zeroAddress } from 'viem'
import type { ResolvedConfig } from './types.js'

export async function canExecute(
  config: ResolvedConfig,
  slot: ConditionSlot,
  paymentInfo: PaymentInfo,
  amount: bigint,
  data: Hex = '0x',
): Promise<boolean> {
  const conditionAddress = await getConditionAddress(config.publicClient, {
    operatorAddress: config.operatorAddress,
    slot,
  })

  if (conditionAddress === zeroAddress) return true

  const caller = config.walletClient?.account?.address ?? zeroAddress

  try {
    return await config.publicClient.readContract({
      address: conditionAddress,
      abi: iConditionAbi,
      functionName: 'check',
      args: [paymentInfo, amount, caller, data],
    })
  } catch (error) {
    if (error instanceof BaseError) return false
    throw error
  }
}
