import type { Address, PublicClient } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'

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

const SLOT_NAMES = [
  'ESCROW',
  'AUTHORIZE_CONDITION',
  'AUTHORIZE_RECORDER',
  'CHARGE_CONDITION',
  'CHARGE_RECORDER',
  'RELEASE_CONDITION',
  'RELEASE_RECORDER',
  'REFUND_IN_ESCROW_CONDITION',
  'REFUND_IN_ESCROW_RECORDER',
  'REFUND_POST_ESCROW_CONDITION',
  'REFUND_POST_ESCROW_RECORDER',
  'FEE_CALCULATOR',
  'FEE_RECIPIENT',
  'PROTOCOL_FEE_CONFIG',
] as const

export async function getOperatorConfig(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<OperatorSlots> {
  const results = await Promise.all(
    SLOT_NAMES.map((name) =>
      publicClient.readContract({
        address: operatorAddress,
        abi: paymentOperatorAbi,
        functionName: name,
      }),
    ),
  )

  return {
    escrow: results[0] as Address,
    authorizeCondition: results[1] as Address,
    authorizeRecorder: results[2] as Address,
    chargeCondition: results[3] as Address,
    chargeRecorder: results[4] as Address,
    releaseCondition: results[5] as Address,
    releaseRecorder: results[6] as Address,
    refundInEscrowCondition: results[7] as Address,
    refundInEscrowRecorder: results[8] as Address,
    refundPostEscrowCondition: results[9] as Address,
    refundPostEscrowRecorder: results[10] as Address,
    feeCalculator: results[11] as Address,
    feeRecipient: results[12] as Address,
    protocolFeeConfig: results[13] as Address,
  }
}

export async function getEscrowAddress(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<Address> {
  return publicClient.readContract({
    address: operatorAddress,
    abi: paymentOperatorAbi,
    functionName: 'ESCROW',
  }) as Promise<Address>
}

export async function getConditionAddress(
  publicClient: PublicClient,
  operatorAddress: Address,
  slot: ConditionSlot,
): Promise<Address> {
  return publicClient.readContract({
    address: operatorAddress,
    abi: paymentOperatorAbi,
    functionName: slot,
  }) as Promise<Address>
}
