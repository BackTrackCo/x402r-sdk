import { zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'
import {
  getConditionAddress,
  getEscrowAddress,
  getOperatorConfig,
} from '../src/operations/operator.js'
import { createMockPublicClient } from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const
const MOCK_ESCROW = '0x2222222222222222222222222222222222222222' as const
const MOCK_ADDR = '0x3333333333333333333333333333333333333333' as const

// ---------------------------------------------------------------------------
// getOperatorConfig
// ---------------------------------------------------------------------------

describe('getOperatorConfig', () => {
  it('returns all 14 slots', async () => {
    const client = createMockPublicClient({
      ESCROW: MOCK_ESCROW,
      AUTHORIZE_CONDITION: MOCK_ADDR,
      AUTHORIZE_RECORDER: MOCK_ADDR,
      CHARGE_CONDITION: MOCK_ADDR,
      CHARGE_RECORDER: MOCK_ADDR,
      RELEASE_CONDITION: MOCK_ADDR,
      RELEASE_RECORDER: MOCK_ADDR,
      REFUND_IN_ESCROW_CONDITION: MOCK_ADDR,
      REFUND_IN_ESCROW_RECORDER: MOCK_ADDR,
      REFUND_POST_ESCROW_CONDITION: MOCK_ADDR,
      REFUND_POST_ESCROW_RECORDER: MOCK_ADDR,
      FEE_CALCULATOR: MOCK_ADDR,
      FEE_RECIPIENT: MOCK_ADDR,
      PROTOCOL_FEE_CONFIG: MOCK_ADDR,
    })

    const config = await getOperatorConfig(client, MOCK_OPERATOR)

    expect(config.escrow).toBe(MOCK_ESCROW)
    expect(config.authorizeCondition).toBe(MOCK_ADDR)
    expect(config.authorizeRecorder).toBe(MOCK_ADDR)
    expect(config.chargeCondition).toBe(MOCK_ADDR)
    expect(config.chargeRecorder).toBe(MOCK_ADDR)
    expect(config.releaseCondition).toBe(MOCK_ADDR)
    expect(config.releaseRecorder).toBe(MOCK_ADDR)
    expect(config.refundInEscrowCondition).toBe(MOCK_ADDR)
    expect(config.refundInEscrowRecorder).toBe(MOCK_ADDR)
    expect(config.refundPostEscrowCondition).toBe(MOCK_ADDR)
    expect(config.refundPostEscrowRecorder).toBe(MOCK_ADDR)
    expect(config.feeCalculator).toBe(MOCK_ADDR)
    expect(config.feeRecipient).toBe(MOCK_ADDR)
    expect(config.protocolFeeConfig).toBe(MOCK_ADDR)
    expect(client.readContract).toHaveBeenCalledTimes(14)
  })

  it('handles zero addresses', async () => {
    const client = createMockPublicClient({
      ESCROW: MOCK_ESCROW,
      AUTHORIZE_CONDITION: zeroAddress,
      AUTHORIZE_RECORDER: zeroAddress,
      CHARGE_CONDITION: zeroAddress,
      CHARGE_RECORDER: zeroAddress,
      RELEASE_CONDITION: zeroAddress,
      RELEASE_RECORDER: zeroAddress,
      REFUND_IN_ESCROW_CONDITION: zeroAddress,
      REFUND_IN_ESCROW_RECORDER: zeroAddress,
      REFUND_POST_ESCROW_CONDITION: zeroAddress,
      REFUND_POST_ESCROW_RECORDER: zeroAddress,
      FEE_CALCULATOR: zeroAddress,
      FEE_RECIPIENT: zeroAddress,
      PROTOCOL_FEE_CONFIG: zeroAddress,
    })

    const config = await getOperatorConfig(client, MOCK_OPERATOR)
    expect(config.feeCalculator).toBe(zeroAddress)
    expect(config.protocolFeeConfig).toBe(zeroAddress)
  })
})

// ---------------------------------------------------------------------------
// getEscrowAddress
// ---------------------------------------------------------------------------

describe('getEscrowAddress', () => {
  it('returns escrow address', async () => {
    const client = createMockPublicClient({ ESCROW: MOCK_ESCROW })
    const result = await getEscrowAddress(client, MOCK_OPERATOR)
    expect(result).toBe(MOCK_ESCROW)
  })
})

// ---------------------------------------------------------------------------
// getConditionAddress
// ---------------------------------------------------------------------------

describe('getConditionAddress', () => {
  const slots = [
    'AUTHORIZE_CONDITION',
    'CHARGE_CONDITION',
    'RELEASE_CONDITION',
    'REFUND_IN_ESCROW_CONDITION',
    'REFUND_POST_ESCROW_CONDITION',
  ] as const

  it.each(slots)('reads %s', async (slot) => {
    const client = createMockPublicClient({ [slot]: MOCK_ADDR })
    const result = await getConditionAddress(client, MOCK_OPERATOR, slot)
    expect(result).toBe(MOCK_ADDR)
  })
})
