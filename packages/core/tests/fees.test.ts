import type { PublicClient, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import {
  calculateOperatorFeeBps,
  calculateProtocolFeeBps,
  calculateTotalFees,
  distributeFees,
  formatFeeBreakdown,
  validateFeeBounds,
  type FeeCalculationResult,
  getFeeAddresses,
} from '../src/fees/index.js'
import { makePaymentInfo } from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const
const MOCK_FEE_CALCULATOR = '0x2222222222222222222222222222222222222222' as const
const MOCK_PROTOCOL_FEE_CONFIG = '0x3333333333333333333333333333333333333333' as const
const MOCK_FEE_RECIPIENT = '0x4444444444444444444444444444444444444444' as const
const MOCK_PROTOCOL_CALCULATOR = '0x5555555555555555555555555555555555555555' as const
const MOCK_PROTOCOL_RECIPIENT = '0x6666666666666666666666666666666666666666' as const
const MOCK_CALLER = '0x7777777777777777777777777777777777777777' as const
const MOCK_TOKEN = '0x8888888888888888888888888888888888888888' as const

const mockPublicClient = (responses: Record<string, unknown>) =>
  ({
    readContract: vi.fn(({ address, functionName }: any) => {
      const key = `${address}:${functionName}`
      return Promise.resolve(responses[key] ?? responses[functionName])
    }),
  }) as unknown as PublicClient

// ---------------------------------------------------------------------------
// getFeeAddresses
// ---------------------------------------------------------------------------

describe('getFeeAddresses', () => {
  it('returns all addresses when protocolFeeConfig is set', async () => {
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_OPERATOR}:FEE_RECIPIENT`]: MOCK_FEE_RECIPIENT,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:calculator`]: MOCK_PROTOCOL_CALCULATOR,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeRecipient`]: MOCK_PROTOCOL_RECIPIENT,
    })

    const result = await getFeeAddresses(client, MOCK_OPERATOR)

    expect(result).toEqual({
      operatorFeeCalculator: MOCK_FEE_CALCULATOR,
      protocolFeeConfig: MOCK_PROTOCOL_FEE_CONFIG,
      protocolFeeCalculator: MOCK_PROTOCOL_CALCULATOR,
      operatorFeeRecipient: MOCK_FEE_RECIPIENT,
      protocolFeeRecipient: MOCK_PROTOCOL_RECIPIENT,
    })
  })

  it('skips protocol reads when protocolFeeConfig is zero', async () => {
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: zeroAddress,
      [`${MOCK_OPERATOR}:FEE_RECIPIENT`]: MOCK_FEE_RECIPIENT,
    })

    const result = await getFeeAddresses(client, MOCK_OPERATOR)

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
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: zeroAddress,
    })

    const result = await calculateOperatorFeeBps(
      client, MOCK_OPERATOR, paymentInfo, 1000000n, MOCK_CALLER,
    )

    expect(result).toBe(0n)
  })

  it('returns bps from calculator', async () => {
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
    })

    const result = await calculateOperatorFeeBps(
      client, MOCK_OPERATOR, paymentInfo, 1000000n, MOCK_CALLER,
    )

    expect(result).toBe(250n)
  })
})

// ---------------------------------------------------------------------------
// calculateProtocolFeeBps
// ---------------------------------------------------------------------------

describe('calculateProtocolFeeBps', () => {
  const paymentInfo = makePaymentInfo()

  it('returns 0n when no config is set', async () => {
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: zeroAddress,
    })

    const result = await calculateProtocolFeeBps(
      client, MOCK_OPERATOR, paymentInfo, 1000000n, MOCK_CALLER,
    )

    expect(result).toBe(0n)
  })

  it('returns bps from config', async () => {
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    const result = await calculateProtocolFeeBps(
      client, MOCK_OPERATOR, paymentInfo, 1000000n, MOCK_CALLER,
    )

    expect(result).toBe(100n)
  })
})

// ---------------------------------------------------------------------------
// calculateTotalFees
// ---------------------------------------------------------------------------

describe('calculateTotalFees', () => {
  const paymentInfo = makePaymentInfo()

  it('returns correct breakdown with both fees', async () => {
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    const result = await calculateTotalFees(
      client, MOCK_OPERATOR, paymentInfo, 1000000n, MOCK_CALLER,
    )

    expect(result.operatorFeeBps).toBe(250n)
    expect(result.protocolFeeBps).toBe(100n)
    expect(result.totalFeeBps).toBe(350n)
  })

  it('returns zeros when both fees are zero', async () => {
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: zeroAddress,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: zeroAddress,
    })

    const result = await calculateTotalFees(
      client, MOCK_OPERATOR, paymentInfo, 1000000n, MOCK_CALLER,
    )

    expect(result.totalFeeBps).toBe(0n)
    expect(result.totalFeeAmount).toBe(0n)
    expect(result.netAmount).toBe(1000000n)
  })

  it('computes amounts correctly', async () => {
    // 250 bps operator + 100 bps protocol on 1,000,000 (1 USDC)
    const client = mockPublicClient({
      [`${MOCK_OPERATOR}:FEE_CALCULATOR`]: MOCK_FEE_CALCULATOR,
      [`${MOCK_OPERATOR}:PROTOCOL_FEE_CONFIG`]: MOCK_PROTOCOL_FEE_CONFIG,
      [`${MOCK_FEE_CALCULATOR}:calculateFee`]: 250n,
      [`${MOCK_PROTOCOL_FEE_CONFIG}:getProtocolFeeBps`]: 100n,
    })

    const amount = 1000000n
    const result = await calculateTotalFees(
      client, MOCK_OPERATOR, paymentInfo, amount, MOCK_CALLER,
    )

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

    expect(result).toContain('Operator: 2.5 bps (0.025 USDC)')
    expect(result).toContain('Protocol: 1 bps (0.01 USDC)')
    expect(result).toContain('Total: 3.5 bps (0.035 USDC)')
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
    expect(result).toContain('Operator: 5 bps')
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

    expect(result).toContain('Total: 0 bps (0 USDC)')
  })
})

// ---------------------------------------------------------------------------
// distributeFees
// ---------------------------------------------------------------------------

describe('distributeFees', () => {
  it('returns transaction hash', async () => {
    const mockHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    const walletClient = {
      writeContract: vi.fn().mockResolvedValue(mockHash),
      chain: { id: 84532 },
      account: { address: MOCK_CALLER },
    } as unknown as WalletClient

    const result = await distributeFees(walletClient, MOCK_OPERATOR, MOCK_TOKEN)

    expect(result).toBe(mockHash)
    expect(walletClient.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_OPERATOR,
        functionName: 'distributeFees',
        args: [MOCK_TOKEN],
      }),
    )
  })
})
