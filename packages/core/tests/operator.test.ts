import { describe, expect, it } from 'vitest'
import {
  getConditionAddress,
  getEscrowAddress,
  getOperatorConfig,
} from '../src/actions/operator/getOperatorConfig.js'
import { createMockPublicClient } from './fixtures.js'

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

// 14 distinct addresses — one per slot — so misalignment is detectable
const SLOT_ADDRESSES = {
  ESCROW: '0x0000000000000000000000000000000000000001',
  AUTHORIZE_PRE_ACTION_CONDITION: '0x0000000000000000000000000000000000000002',
  AUTHORIZE_POST_ACTION_HOOK: '0x0000000000000000000000000000000000000003',
  CHARGE_PRE_ACTION_CONDITION: '0x0000000000000000000000000000000000000004',
  CHARGE_POST_ACTION_HOOK: '0x0000000000000000000000000000000000000005',
  CAPTURE_PRE_ACTION_CONDITION: '0x0000000000000000000000000000000000000006',
  CAPTURE_POST_ACTION_HOOK: '0x0000000000000000000000000000000000000007',
  VOID_PRE_ACTION_CONDITION: '0x0000000000000000000000000000000000000008',
  VOID_POST_ACTION_HOOK: '0x0000000000000000000000000000000000000009',
  REFUND_PRE_ACTION_CONDITION: '0x000000000000000000000000000000000000000a',
  REFUND_POST_ACTION_HOOK: '0x000000000000000000000000000000000000000b',
  FEE_CALCULATOR: '0x000000000000000000000000000000000000000c',
  FEE_RECEIVER: '0x000000000000000000000000000000000000000d',
  PROTOCOL_FEE_CONFIG: '0x000000000000000000000000000000000000000e',
} as const

describe('getOperatorConfig', () => {
  it('maps all 14 multicall results to the correct named fields', async () => {
    const client = createMockPublicClient(SLOT_ADDRESSES)
    const result = await getOperatorConfig(client, {
      operatorAddress: MOCK_CONTRACT,
    })

    expect(result).toEqual({
      escrow: SLOT_ADDRESSES.ESCROW,
      authorizeCondition: SLOT_ADDRESSES.AUTHORIZE_PRE_ACTION_CONDITION,
      authorizeRecorder: SLOT_ADDRESSES.AUTHORIZE_POST_ACTION_HOOK,
      chargeCondition: SLOT_ADDRESSES.CHARGE_PRE_ACTION_CONDITION,
      chargeRecorder: SLOT_ADDRESSES.CHARGE_POST_ACTION_HOOK,
      releaseCondition: SLOT_ADDRESSES.CAPTURE_PRE_ACTION_CONDITION,
      releaseRecorder: SLOT_ADDRESSES.CAPTURE_POST_ACTION_HOOK,
      refundInEscrowCondition: SLOT_ADDRESSES.VOID_PRE_ACTION_CONDITION,
      refundInEscrowRecorder: SLOT_ADDRESSES.VOID_POST_ACTION_HOOK,
      refundPostEscrowCondition: SLOT_ADDRESSES.REFUND_PRE_ACTION_CONDITION,
      refundPostEscrowRecorder: SLOT_ADDRESSES.REFUND_POST_ACTION_HOOK,
      feeCalculator: SLOT_ADDRESSES.FEE_CALCULATOR,
      feeRecipient: SLOT_ADDRESSES.FEE_RECEIVER,
      protocolFeeConfig: SLOT_ADDRESSES.PROTOCOL_FEE_CONFIG,
    })
  })
})

describe('getEscrowAddress', () => {
  it('returns the ESCROW slot address', async () => {
    const client = createMockPublicClient({ ESCROW: SLOT_ADDRESSES.ESCROW })
    const result = await getEscrowAddress(client, {
      operatorAddress: MOCK_CONTRACT,
    })
    expect(result).toBe(SLOT_ADDRESSES.ESCROW)
  })
})

describe('getConditionAddress', () => {
  it('returns the address for the given condition slot', async () => {
    const client = createMockPublicClient({
      AUTHORIZE_PRE_ACTION_CONDITION:
        SLOT_ADDRESSES.AUTHORIZE_PRE_ACTION_CONDITION,
    })
    const result = await getConditionAddress(client, {
      operatorAddress: MOCK_CONTRACT,
      slot: 'AUTHORIZE_PRE_ACTION_CONDITION',
    })
    expect(result).toBe(SLOT_ADDRESSES.AUTHORIZE_PRE_ACTION_CONDITION)
  })
})
