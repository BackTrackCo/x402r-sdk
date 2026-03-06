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

const SLOT_ENTRIES = [
  ['ESCROW', 'escrow'],
  ['AUTHORIZE_CONDITION', 'authorizeCondition'],
  ['AUTHORIZE_RECORDER', 'authorizeRecorder'],
  ['CHARGE_CONDITION', 'chargeCondition'],
  ['CHARGE_RECORDER', 'chargeRecorder'],
  ['RELEASE_CONDITION', 'releaseCondition'],
  ['RELEASE_RECORDER', 'releaseRecorder'],
  ['REFUND_IN_ESCROW_CONDITION', 'refundInEscrowCondition'],
  ['REFUND_IN_ESCROW_RECORDER', 'refundInEscrowRecorder'],
  ['REFUND_POST_ESCROW_CONDITION', 'refundPostEscrowCondition'],
  ['REFUND_POST_ESCROW_RECORDER', 'refundPostEscrowRecorder'],
  ['FEE_CALCULATOR', 'feeCalculator'],
  ['FEE_RECIPIENT', 'feeRecipient'],
  ['PROTOCOL_FEE_CONFIG', 'protocolFeeConfig'],
] as const satisfies readonly (readonly [string, keyof OperatorSlots])[]

export async function getOperatorConfig(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<OperatorSlots> {
  const results = await Promise.all(
    SLOT_ENTRIES.map(([contractName]) =>
      publicClient.readContract({
        address: operatorAddress,
        abi: paymentOperatorAbi,
        functionName: contractName,
      }),
    ),
  )

  const slots: Record<string, Address> = {}
  for (let i = 0; i < SLOT_ENTRIES.length; i++) {
    slots[SLOT_ENTRIES[i][1]] = results[i] as Address
  }
  return slots as unknown as OperatorSlots
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
