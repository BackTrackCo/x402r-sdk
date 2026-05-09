import { describe, expect, it } from 'vitest'
import { calculateOperatorFeeBps } from '../src/actions/fees/calculateOperatorFeeBps.js'
import { calculateProtocolFeeBps } from '../src/actions/fees/calculateProtocolFeeBps.js'
import { calculateTotalFees } from '../src/actions/fees/calculateTotalFees.js'
import { distributeFees } from '../src/actions/fees/distributeFees.js'
import { formatFeeBreakdown } from '../src/actions/fees/formatFeeBreakdown.js'
import { getAuthorizedFees } from '../src/actions/fees/getAuthorizedFees.js'
import { getFeeAddresses } from '../src/actions/fees/getFeeAddresses.js'
import type { FeeCalculationResult } from '../src/actions/fees/types.js'
import { validateFeeBounds } from '../src/actions/fees/validateFeeBounds.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockWalletWithoutAccount,
  MOCK_TX_HASH,
  makePaymentInfo,
  zeroAddress,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const
const MOCK_FEE_CALCULATOR =
  '0x2222222222222222222222222222222222222222' as const
const MOCK_PROTOCOL_FEE_CONFIG =
  '0x3333333333333333333333333333333333333333' as const
const MOCK_FEE_RECIPIENT = '0x4444444444444444444444444444444444444444' as const
const MOCK_PROTOCOL_CALCULATOR =
  '0x5555555555555555555555555555555555555555' as const
const MOCK_PROTOCOL_RECIPIENT =
  '0x6666666666666666666666666666666666666666' as const
const MOCK_CALLER = '0x7777777777777777777777777777777777777777' as const
const MOCK_TOKEN = '0x8888888888888888888888888888888888888888' as const

// ---------------------------------------------------------------------------
// getFeeAddresses
// ---------------------------------------------------------------------------

describe('getFeeAddresses', () => {
  it('returns all addresses when protocolFeeConfig is set', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_OPERATOR}:FEE_RECEIVER`]: MOCK_FEE_RECIPIENT,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:calculator`]: MOCK_PROTOCOL_CALCULATOR,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeRecipient`]:
        MOCK_PROTOCOL_RECIPIENT,
    })

    const result = await getFeeAddresses(client, {
      operatorAddress: MOCK_OPERATOR,
    })

    expect(result).toEqual({
      operatorFeeCalculator: MOCK_FEE_CALCULATOR,
      protocolFeeConfig: MOCK_PROTOCOL_FEE_CONFIG,
      protocolFeeCalculator: MOCK_PROTOCOL_CALCULATOR,
      operatorFeeRecipient: MOCK_FEE_RECIPIENT,
      protocolFeeRecipient: MOCK_PROTOCOL_RECIPIENT,
    })
  })

  it('skips protocol reads when protocolFeeConfig is zero', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: zeroAddress,
      [`${MOCK_OPERATOR}:FEE_RECEIVER`]: MOCK_FEE_RECIPIENT,
    })

    const result = await getFeeAddresses(client, {
      operatorAddress: MOCK_OPERATOR,
    })

    expect(result.protocolFeeCalculator).toBe(zeroAddress)
    expect(result.protocolFeeRecipient).toBe(zeroAddress)
    // Should only have 3 calls (no protocol reads)
    expect(client.readContract).toHaveBeenCalledTimes(3)
  })
})

// ---------------------------------------------------------------------------
// calculateOperatorFeeBps
// ---------------------------------------------------------------------------

describe('calculateOperatorFeeBps', () => {
  const paymentInfo = makePaymentInfo()

  it('returns 0n when no calculator is set', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: zeroAddress,
    })

    const result = await calculateOperatorFeeBps(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    expect(result).toBe(0n)
  })

  it('returns bps from calculator', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
    })

    const result = await calculateOperatorFeeBps(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    expect(result).toBe(250n)
  })
})

// ---------------------------------------------------------------------------
// calculateProtocolFeeBps
// ---------------------------------------------------------------------------

describe('calculateProtocolFeeBps', () => {
  const paymentInfo = makePaymentInfo()

  it('returns 0n when no config is set', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: zeroAddress,
    })

    const result = await calculateProtocolFeeBps(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    expect(result).toBe(0n)
  })

  it('returns bps from config', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    const result = await calculateProtocolFeeBps(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    expect(result).toBe(100n)
  })
})

// ---------------------------------------------------------------------------
// calculateTotalFees
// ---------------------------------------------------------------------------

describe('calculateTotalFees', () => {
  const paymentInfo = makePaymentInfo()

  it('handles amount = 0n without division errors', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    const result = await calculateTotalFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 0n,
      caller: MOCK_CALLER,
    })

    expect(result.operatorFeeAmount).toBe(0n)
    expect(result.protocolFeeAmount).toBe(0n)
    expect(result.totalFeeAmount).toBe(0n)
    expect(result.netAmount).toBe(0n)
  })

  it('returns correct breakdown with both fees', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    const result = await calculateTotalFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    expect(result.operatorFeeBps).toBe(250n)
    expect(result.protocolFeeBps).toBe(100n)
    expect(result.totalFeeBps).toBe(350n)
  })

  it('makes at most 4 RPC calls', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    await calculateTotalFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    // 2 config reads + 2 calculator reads = 4 total (no redundant calls)
    expect(client.readContract).toHaveBeenCalledTimes(4)
  })

  it('skips calculator calls when addresses are zero', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: zeroAddress,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: zeroAddress,
    })

    await calculateTotalFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    // Only 2 config reads, no calculator calls needed
    expect(client.readContract).toHaveBeenCalledTimes(2)
  })

  it('returns zeros when both fees are zero', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: zeroAddress,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: zeroAddress,
    })

    const result = await calculateTotalFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount: 1000000n,
      caller: MOCK_CALLER,
    })

    expect(result.totalFeeBps).toBe(0n)
    expect(result.totalFeeAmount).toBe(0n)
    expect(result.netAmount).toBe(1000000n)
  })

  it('computes amounts correctly', async () => {
    // 250 bps operator + 100 bps protocol on 1,000,000 (1 USDC)
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    const amount = 1000000n
    const result = await calculateTotalFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfo,
      amount,
      caller: MOCK_CALLER,
    })

    // 250 bps = 2.5% → 25000
    expect(result.operatorFeeAmount).toBe(25000n)
    // 100 bps = 1% → 10000
    expect(result.protocolFeeAmount).toBe(10000n)
    expect(result.totalFeeAmount).toBe(35000n)
    expect(result.netAmount).toBe(965000n)
  })
})

// ---------------------------------------------------------------------------
// validateFeeBounds
// ---------------------------------------------------------------------------

describe('validateFeeBounds', () => {
  const makeFees = (totalFeeBps: bigint): FeeCalculationResult => ({
    protocolFeeBps: 0n,
    operatorFeeBps: totalFeeBps,
    totalFeeBps,
    protocolFeeAmount: 0n,
    operatorFeeAmount: 0n,
    totalFeeAmount: 0n,
    netAmount: 0n,
  })

  it('returns true when within bounds', () => {
    const fees = makeFees(250n)
    const paymentInfo = makePaymentInfo({ minFeeBps: 100, maxFeeBps: 500 })
    expect(validateFeeBounds(fees, paymentInfo)).toBe(true)
  })

  it('returns false when below min', () => {
    const fees = makeFees(50n)
    const paymentInfo = makePaymentInfo({ minFeeBps: 100, maxFeeBps: 500 })
    expect(validateFeeBounds(fees, paymentInfo)).toBe(false)
  })

  it('returns true at exact min boundary', () => {
    const fees = makeFees(100n)
    const paymentInfo = makePaymentInfo({ minFeeBps: 100, maxFeeBps: 500 })
    expect(validateFeeBounds(fees, paymentInfo)).toBe(true)
  })

  it('returns true at exact max boundary', () => {
    const fees = makeFees(500n)
    const paymentInfo = makePaymentInfo({ minFeeBps: 100, maxFeeBps: 500 })
    expect(validateFeeBounds(fees, paymentInfo)).toBe(true)
  })

  it('returns false when above max', () => {
    const fees = makeFees(600n)
    const paymentInfo = makePaymentInfo({ minFeeBps: 100, maxFeeBps: 500 })
    expect(validateFeeBounds(fees, paymentInfo)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatFeeBreakdown
// ---------------------------------------------------------------------------

describe('formatFeeBreakdown', () => {
  it('formats with default USDC params', () => {
    const fees: FeeCalculationResult = {
      operatorFeeBps: 250n,
      protocolFeeBps: 100n,
      totalFeeBps: 350n,
      operatorFeeAmount: 25000n,
      protocolFeeAmount: 10000n,
      totalFeeAmount: 35000n,
      netAmount: 965000n,
    }

    const result = formatFeeBreakdown(fees)

    expect(result).toContain('Operator: 250 bps (2.5%) (0.025 USDC)')
    expect(result).toContain('Protocol: 100 bps (1%) (0.01 USDC)')
    expect(result).toContain('Total: 350 bps (3.5%) (0.035 USDC)')
  })

  it('uses custom symbol and decimals', () => {
    const fees: FeeCalculationResult = {
      operatorFeeBps: 500n,
      protocolFeeBps: 0n,
      totalFeeBps: 500n,
      operatorFeeAmount: 50000000000000000n,
      protocolFeeAmount: 0n,
      totalFeeAmount: 50000000000000000n,
      netAmount: 950000000000000000n,
    }

    const result = formatFeeBreakdown(fees, 18, 'WETH')

    expect(result).toContain('WETH')
    expect(result).toContain('Operator: 500 bps (5%)')
  })

  it('handles zero fees', () => {
    const fees: FeeCalculationResult = {
      operatorFeeBps: 0n,
      protocolFeeBps: 0n,
      totalFeeBps: 0n,
      operatorFeeAmount: 0n,
      protocolFeeAmount: 0n,
      totalFeeAmount: 0n,
      netAmount: 1000000n,
    }

    const result = formatFeeBreakdown(fees)

    expect(result).toContain('Total: 0 bps (0%) (0 USDC)')
  })
})

// ---------------------------------------------------------------------------
// getAuthorizedFees
// ---------------------------------------------------------------------------

describe('getAuthorizedFees', () => {
  const MOCK_HASH =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const

  it('maps contract tuple to { totalFeeBps, protocolFeeBps }', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:authorizedFees`]: [350, 100],
    })

    const result = await getAuthorizedFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfoHash: MOCK_HASH,
    })

    expect(result).toEqual({ totalFeeBps: 350, protocolFeeBps: 100 })
  })

  it('returns zeros when no fees are authorized', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:authorizedFees`]: [0, 0],
    })

    const result = await getAuthorizedFees(client, {
      operatorAddress: MOCK_OPERATOR,
      paymentInfoHash: MOCK_HASH,
    })

    expect(result).toEqual({ totalFeeBps: 0, protocolFeeBps: 0 })
  })
})

// ---------------------------------------------------------------------------
// distributeFees
// ---------------------------------------------------------------------------

describe('distributeFees', () => {
  it('throws ContractCallError when account is missing', async () => {
    await expect(
      distributeFees(createMockWalletWithoutAccount(), {
        operatorAddress: MOCK_OPERATOR,
        token: MOCK_TOKEN,
      }),
    ).rejects.toThrow('distributeFees failed')
  })

  it('returns transaction hash', async () => {
    const wallet = createMockWalletClient()

    const result = await distributeFees(wallet, {
      operatorAddress: MOCK_OPERATOR,
      token: MOCK_TOKEN,
    })

    expect(result).toBe(MOCK_TX_HASH)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_OPERATOR,
        functionName: 'distributeFees',
        args: [MOCK_TOKEN],
      }),
    )
  })
})
