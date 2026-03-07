import type { PublicClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  getPaymentAmounts,
  getPaymentState,
} from '../src/operations/payment-state.js'
import {
  createMockPublicClient,
  makePaymentInfo,
  TEST_CHAIN_ID,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const
const MOCK_ESCROW = '0x2222222222222222222222222222222222222222' as const

// ---------------------------------------------------------------------------
// getPaymentState
// ---------------------------------------------------------------------------

describe('getPaymentState', () => {
  const paymentInfo = makePaymentInfo()

  it('chains ESCROW lookup → hash computation → escrow read', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:ESCROW`]: MOCK_ESCROW,
      [`${MOCK_ESCROW}:paymentState`]: [true, 500000n, 500000n],
    })

    const result = await getPaymentState(
      client,
      MOCK_OPERATOR,
      TEST_CHAIN_ID,
      paymentInfo,
    )

    expect(result).toEqual([true, 500000n, 500000n])
    expect(client.readContract).toHaveBeenCalledTimes(2)
  })

  it('uses chainId and escrowAddress for hash computation', async () => {
    const calls: any[] = []
    const client = {
      readContract: vi.fn((params: any) => {
        calls.push(params)
        if (params.functionName === 'ESCROW')
          return Promise.resolve(MOCK_ESCROW)
        return Promise.resolve([false, 0n, 0n])
      }),
    } as unknown as PublicClient

    await getPaymentState(client, MOCK_OPERATOR, TEST_CHAIN_ID, paymentInfo)

    // Second call should be to escrow address with a bytes32 hash arg
    const escrowCall = calls[1]
    expect(escrowCall.address).toBe(MOCK_ESCROW)
    expect(escrowCall.functionName).toBe('paymentState')
    expect(escrowCall.args[0]).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('produces different hashes for different chainIds', async () => {
    const hashes: string[] = []

    for (const chainId of [1, 84532]) {
      const client = {
        readContract: vi.fn((params: any) => {
          if (params.functionName === 'ESCROW')
            return Promise.resolve(MOCK_ESCROW)
          hashes.push(params.args[0])
          return Promise.resolve([false, 0n, 0n])
        }),
      } as unknown as PublicClient

      await getPaymentState(client, MOCK_OPERATOR, chainId, paymentInfo)
    }

    expect(hashes[0]).not.toBe(hashes[1])
  })

  it('returns correct tuple values from escrow response', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:ESCROW`]: MOCK_ESCROW,
      [`${MOCK_ESCROW}:paymentState`]: [true, 750000n, 250000n],
    })

    const result = await getPaymentState(
      client,
      MOCK_OPERATOR,
      TEST_CHAIN_ID,
      paymentInfo,
    )

    expect(result[0]).toBe(true) // hasCollectedPayment
    expect(result[1]).toBe(750000n) // capturableAmount
    expect(result[2]).toBe(250000n) // refundableAmount
  })

  it('wraps ESCROW read failure as ContractCallError', async () => {
    const { BaseError } = await import('viem')
    const client = {
      readContract: vi.fn(() => {
        throw new BaseError('execution reverted', { details: 'bad call' })
      }),
    } as unknown as PublicClient

    await expect(
      getPaymentState(client, MOCK_OPERATOR, TEST_CHAIN_ID, paymentInfo),
    ).rejects.toThrow(ContractCallError)
  })

  it('wraps escrow paymentState read failure as ContractCallError', async () => {
    const { BaseError } = await import('viem')
    const client = {
      readContract: vi.fn((params: any) => {
        if (params.functionName === 'ESCROW')
          return Promise.resolve(MOCK_ESCROW)
        throw new BaseError('execution reverted', {
          details: 'state read failed',
        })
      }),
    } as unknown as PublicClient

    await expect(
      getPaymentState(client, MOCK_OPERATOR, TEST_CHAIN_ID, paymentInfo),
    ).rejects.toThrow(ContractCallError)
  })
})

// ---------------------------------------------------------------------------
// getPaymentAmounts
// ---------------------------------------------------------------------------

describe('getPaymentAmounts', () => {
  const paymentInfo = makePaymentInfo()

  it('returns named object from tuple', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:ESCROW`]: MOCK_ESCROW,
      [`${MOCK_ESCROW}:paymentState`]: [true, 750000n, 250000n],
    })

    const result = await getPaymentAmounts(
      client,
      MOCK_OPERATOR,
      TEST_CHAIN_ID,
      paymentInfo,
    )

    expect(result).toEqual({
      hasCollectedPayment: true,
      capturableAmount: 750000n,
      refundableAmount: 250000n,
    })
  })

  it('propagates errors from getPaymentState', async () => {
    const { BaseError } = await import('viem')
    const client = {
      readContract: vi.fn(() => {
        throw new BaseError('execution reverted', { details: 'bad call' })
      }),
    } as unknown as PublicClient

    await expect(
      getPaymentAmounts(client, MOCK_OPERATOR, TEST_CHAIN_ID, paymentInfo),
    ).rejects.toThrow(ContractCallError)
  })
})
