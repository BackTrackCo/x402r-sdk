import { type Address, type PublicClient, zeroAddress } from 'viem'
import {
  paymentOperatorAbi,
  protocolFeeConfigAbi,
} from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface CalculateProtocolFeeBpsParameters {
  operatorAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  caller: Address
}
export type CalculateProtocolFeeBpsReturnType = bigint

export async function calculateProtocolFeeBps(
  publicClient: PublicClient,
  parameters: CalculateProtocolFeeBpsParameters,
): Promise<CalculateProtocolFeeBpsReturnType> {
  const { operatorAddress, paymentInfo, amount, caller } = parameters

  return wrapContractCall('calculateProtocolFeeBps', async () => {
    const protocolFeeConfig = await publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'PROTOCOL_FEE_CONFIG',
    })

    if (protocolFeeConfig === zeroAddress) return 0n

    return publicClient.readContract({
      address: protocolFeeConfig,
      abi: protocolFeeConfigAbi,
      functionName: 'getProtocolFeeBps',
      args: [paymentInfo, amount, caller],
    })
  })
}
