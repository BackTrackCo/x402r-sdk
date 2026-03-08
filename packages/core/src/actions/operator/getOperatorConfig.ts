import type { Address, PublicClient } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'
import type { ConditionSlot, OperatorSlots } from './types.js'

export interface GetOperatorConfigParameters {
  operatorAddress: Address
}
export type GetOperatorConfigReturnType = OperatorSlots

export async function getOperatorConfig(
  publicClient: PublicClient,
  parameters: GetOperatorConfigParameters,
): Promise<GetOperatorConfigReturnType> {
  const { operatorAddress } = parameters

  return wrapContractCall('getOperatorConfig', async () => {
    const contract = {
      address: operatorAddress,
      abi: paymentOperatorAbi,
    } as const

    const [
      escrow,
      authorizeCondition,
      authorizeRecorder,
      chargeCondition,
      chargeRecorder,
      releaseCondition,
      releaseRecorder,
      refundInEscrowCondition,
      refundInEscrowRecorder,
      refundPostEscrowCondition,
      refundPostEscrowRecorder,
      feeCalculator,
      feeRecipient,
      protocolFeeConfig,
    ] = await publicClient.multicall({
      contracts: [
        { ...contract, functionName: 'ESCROW' },
        { ...contract, functionName: 'AUTHORIZE_CONDITION' },
        { ...contract, functionName: 'AUTHORIZE_RECORDER' },
        { ...contract, functionName: 'CHARGE_CONDITION' },
        { ...contract, functionName: 'CHARGE_RECORDER' },
        { ...contract, functionName: 'RELEASE_CONDITION' },
        { ...contract, functionName: 'RELEASE_RECORDER' },
        { ...contract, functionName: 'REFUND_IN_ESCROW_CONDITION' },
        { ...contract, functionName: 'REFUND_IN_ESCROW_RECORDER' },
        { ...contract, functionName: 'REFUND_POST_ESCROW_CONDITION' },
        { ...contract, functionName: 'REFUND_POST_ESCROW_RECORDER' },
        { ...contract, functionName: 'FEE_CALCULATOR' },
        { ...contract, functionName: 'FEE_RECIPIENT' },
        { ...contract, functionName: 'PROTOCOL_FEE_CONFIG' },
      ],
      allowFailure: false,
    })

    return {
      escrow,
      authorizeCondition,
      authorizeRecorder,
      chargeCondition,
      chargeRecorder,
      releaseCondition,
      releaseRecorder,
      refundInEscrowCondition,
      refundInEscrowRecorder,
      refundPostEscrowCondition,
      refundPostEscrowRecorder,
      feeCalculator,
      feeRecipient,
      protocolFeeConfig,
    } satisfies OperatorSlots
  })
}

export interface GetEscrowAddressParameters {
  operatorAddress: Address
}
export type GetEscrowAddressReturnType = Address

export async function getEscrowAddress(
  publicClient: PublicClient,
  parameters: GetEscrowAddressParameters,
): Promise<GetEscrowAddressReturnType> {
  const { operatorAddress } = parameters

  return wrapContractCall('getEscrowAddress', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'ESCROW',
    }),
  )
}

export interface GetConditionAddressParameters {
  operatorAddress: Address
  slot: ConditionSlot
}
export type GetConditionAddressReturnType = Address

export async function getConditionAddress(
  publicClient: PublicClient,
  parameters: GetConditionAddressParameters,
): Promise<GetConditionAddressReturnType> {
  const { operatorAddress, slot } = parameters

  return wrapContractCall('getConditionAddress', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: slot,
    }),
  )
}
