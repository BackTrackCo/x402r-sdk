import type { ConditionSlot, PaymentInfo } from '@x402r/core'
import { alwaysTrueConditionAbi, getConditionAddress } from '@x402r/core'
import { BaseError, zeroAddress } from 'viem'
import type { ResolvedConfig } from './types.js'

// ICondition.check() has the same signature across all conditions.
// We reuse AlwaysTrueCondition's ABI since it only has `check`.
const iConditionAbi = alwaysTrueConditionAbi

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
