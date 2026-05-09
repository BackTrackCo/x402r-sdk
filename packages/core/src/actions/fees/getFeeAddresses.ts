import { type Address, type PublicClient, zeroAddress } from 'viem'
import {
  paymentOperatorAbi,
  protocolFeeConfigAbi,
} from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { FeeAddresses } from './types.js'

export interface GetFeeAddressesParameters {
  operatorAddress: Address
}
export type GetFeeAddressesReturnType = FeeAddresses

export async function getFeeAddresses(
  publicClient: PublicClient,
  parameters: GetFeeAddressesParameters,
): Promise<GetFeeAddressesReturnType> {
  const { operatorAddress } = parameters

  return wrapContractCall('getFeeAddresses', async () => {
    const [operatorFeeCalculator, protocolFeeConfig, operatorFeeRecipient] =
      await Promise.all([
        publicClient.readContract({
          address: operatorAddress,
          abi: paymentOperatorAbi,
          functionName: 'FEE_CALCULATOR',
        }),
        publicClient.readContract({
          address: operatorAddress,
          abi: paymentOperatorAbi,
          functionName: 'PROTOCOL_FEE_CONFIG',
        }),
        publicClient.readContract({
          address: operatorAddress,
          abi: paymentOperatorAbi,
          functionName: 'FEE_RECEIVER',
        }),
      ])

    let protocolFeeCalculator: Address = zeroAddress
    let protocolFeeRecipient: Address = zeroAddress

    if (protocolFeeConfig !== zeroAddress) {
      ;[protocolFeeCalculator, protocolFeeRecipient] = await Promise.all([
        publicClient.readContract({
          address: protocolFeeConfig,
          abi: protocolFeeConfigAbi,
          functionName: 'calculator',
        }),
        publicClient.readContract({
          address: protocolFeeConfig,
          abi: protocolFeeConfigAbi,
          functionName: 'getProtocolFeeRecipient',
        }),
      ])
    }

    return {
      operatorFeeCalculator,
      protocolFeeConfig,
      protocolFeeCalculator,
      operatorFeeRecipient,
      protocolFeeRecipient,
    }
  })
}
