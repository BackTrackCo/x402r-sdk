import type { ConditionSlot, PaymentInfo } from '@x402r/core'
import { getConditionAddress, iConditionAbi } from '@x402r/core'
import { BaseError, zeroAddress } from 'viem'
import type { ResolvedConfig } from './types.js'

export async function canExecute(
  config: ResolvedConfig,
  slot: ConditionSlot,
  paymentInfo: PaymentInfo,
  amount: bigint,
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
      args: [paymentInfo, amount, caller, '0x'],
    })
  } catch (error) {
    if (error instanceof BaseError) return false
    throw error
  }
}
