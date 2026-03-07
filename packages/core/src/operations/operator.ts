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
    const read = <T extends string>(functionName: T) =>
      publicClient.readContract({
        address: operatorAddress,
        abi: paymentOperatorAbi,
        functionName: functionName as any,
      }) as Promise<Address>

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
    ] = await Promise.all([
      read('ESCROW'),
      read('AUTHORIZE_CONDITION'),
      read('AUTHORIZE_RECORDER'),
      read('CHARGE_CONDITION'),
      read('CHARGE_RECORDER'),
      read('RELEASE_CONDITION'),
      read('RELEASE_RECORDER'),
      read('REFUND_IN_ESCROW_CONDITION'),
      read('REFUND_IN_ESCROW_RECORDER'),
      read('REFUND_POST_ESCROW_CONDITION'),
      read('REFUND_POST_ESCROW_RECORDER'),
      read('FEE_CALCULATOR'),
      read('FEE_RECIPIENT'),
      read('PROTOCOL_FEE_CONFIG'),
    ])

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
