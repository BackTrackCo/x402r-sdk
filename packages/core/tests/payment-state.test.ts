import type { PublicClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { getPaymentAmounts } from '../src/actions/escrow/getPaymentAmounts.js'
import { getPaymentState } from '../src/actions/escrow/getPaymentState.js'
import { ContractCallError } from '../src/errors/index.js'
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
const MOCK_HASH = `0x${'ab'.repeat(32)}` as const

// ---------------------------------------------------------------------------
// getPaymentState
// ---------------------------------------------------------------------------

describe('getPaymentState', () => {
  const paymentInfo = makePaymentInfo()

  it('chains ESCROW lookup → on-chain getHash → escrow read', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:ESCROW`]: MOCK_ESCROW,
      [`${MOCK_ESCROW}:getHash`]: MOCK_HASH,
      [`${MOCK_ESCROW}:paymentState`]: [true, 500000n, 500000n],
    })

    const result = await getPaymentState(client, {
      operatorAddress: MOCK_OPERATOR,
      chainId: TEST_CHAIN_ID,
      paymentInfo,
    })

    expect(result).toEqual([true, 500000n, 500000n])
    expect(client.readContract).toHaveBeenCalledTimes(3)
  })

  it('reads the payment hash from the escrow via on-chain getHash', async () => {
    const calls: any[] = []
    const client = {
      readContract: vi.fn((params: any) => {
        calls.push(params)
        if (params.functionName === 'ESCROW')
          return Promise.resolve(MOCK_ESCROW)
        if (params.functionName === 'getHash') return Promise.resolve(MOCK_HASH)
        return Promise.resolve([false, 0n, 0n])
      }),
    } as unknown as PublicClient

    await getPaymentState(client, {
      operatorAddress: MOCK_OPERATOR,
      chainId: TEST_CHAIN_ID,
      paymentInfo,
    })

    // Second call: getHash on the escrow, passed the full paymentInfo struct
    const getHashCall = calls[1]
    expect(getHashCall.address).toBe(MOCK_ESCROW)
    expect(getHashCall.functionName).toBe('getHash')
    expect(getHashCall.args[0]).toBe(paymentInfo)

    // Third call: paymentState on the escrow, keyed by the hash getHash returned
    const stateCall = calls[2]
    expect(stateCall.address).toBe(MOCK_ESCROW)
    expect(stateCall.functionName).toBe('paymentState')
    expect(stateCall.args[0]).toBe(MOCK_HASH)
  })

  it('keys paymentState by whatever hash the escrow getHash returns', async () => {
    // The hash now comes from the contract, not a local computation, so a
    // different getHash result must flow through to the paymentState key.
    const stateArgs: string[] = []

    for (const escrowHash of [`0x${'11'.repeat(32)}`, `0x${'22'.repeat(32)}`]) {
      const client = {
        readContract: vi.fn((params: any) => {
          if (params.functionName === 'ESCROW')
            return Promise.resolve(MOCK_ESCROW)
          if (params.functionName === 'getHash')
            return Promise.resolve(escrowHash)
          stateArgs.push(params.args[0])
          return Promise.resolve([false, 0n, 0n])
        }),
      } as unknown as PublicClient

      await getPaymentState(client, {
        operatorAddress: MOCK_OPERATOR,
        chainId: TEST_CHAIN_ID,
        paymentInfo,
      })
    }

    expect(stateArgs[0]).not.toBe(stateArgs[1])
  })

  it('returns correct tuple values from escrow response', async () => {
    const client = createMockPublicClient({
      [`${MOCK_OPERATOR}:ESCROW`]: MOCK_ESCROW,
      [`${MOCK_ESCROW}:getHash`]: MOCK_HASH,
      [`${MOCK_ESCROW}:paymentState`]: [true, 750000n, 250000n],
    })

    const result = await getPaymentState(client, {
      operatorAddress: MOCK_OPERATOR,
      chainId: TEST_CHAIN_ID,
      paymentInfo,
    })

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
      getPaymentState(client, {
        operatorAddress: MOCK_OPERATOR,
        chainId: TEST_CHAIN_ID,
        paymentInfo,
      }),
    ).rejects.toThrow(ContractCallError)
  })

  it('wraps escrow paymentState read failure as ContractCallError', async () => {
    const { BaseError } = await import('viem')
    const client = {
      readContract: vi.fn((params: any) => {
        if (params.functionName === 'ESCROW')
          return Promise.resolve(MOCK_ESCROW)
        if (params.functionName === 'getHash') return Promise.resolve(MOCK_HASH)
        throw new BaseError('execution reverted', {
          details: 'state read failed',
        })
      }),
    } as unknown as PublicClient

    await expect(
      getPaymentState(client, {
        operatorAddress: MOCK_OPERATOR,
        chainId: TEST_CHAIN_ID,
        paymentInfo,
      }),
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
      [`${MOCK_ESCROW}:getHash`]: MOCK_HASH,
      [`${MOCK_ESCROW}:paymentState`]: [true, 750000n, 250000n],
    })

    const result = await getPaymentAmounts(client, {
      operatorAddress: MOCK_OPERATOR,
      chainId: TEST_CHAIN_ID,
      paymentInfo,
    })

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
      getPaymentAmounts(client, {
        operatorAddress: MOCK_OPERATOR,
        chainId: TEST_CHAIN_ID,
        paymentInfo,
      }),
    ).rejects.toThrow(ContractCallError)
  })
})
