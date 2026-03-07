import type { Address, PublicClient } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OperatorSlots {
  escrow: Address
  authorizeCondition: Address
  authorizeRecorder: Address
  chargeCondition: Address
  chargeRecorder: Address
  releaseCondition: Address
  releaseRecorder: Address
  refundInEscrowCondition: Address
  refundInEscrowRecorder: Address
  refundPostEscrowCondition: Address
  refundPostEscrowRecorder: Address
  feeCalculator: Address
  feeRecipient: Address
  protocolFeeConfig: Address
}

export type ConditionSlot =
  | 'AUTHORIZE_CONDITION'
  | 'CHARGE_CONDITION'
  | 'RELEASE_CONDITION'
  | 'REFUND_IN_ESCROW_CONDITION'
  | 'REFUND_POST_ESCROW_CONDITION'

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

export async function getOperatorConfig(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<OperatorSlots> {
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

export async function getEscrowAddress(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<Address> {
  return wrapContractCall('getEscrowAddress', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'ESCROW',
    }),
  )
}

export async function getConditionAddress(
  publicClient: PublicClient,
  operatorAddress: Address,
  slot: ConditionSlot,
): Promise<Address> {
  return wrapContractCall('getConditionAddress', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: slot,
    }),
  )
}
