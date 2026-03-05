import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  freezePayment,
  isFrozen,
  unfreezePayment,
} from '../src/operations/freeze.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_FREEZE = '0x1111111111111111111111111111111111111111' as const

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

describe('isFrozen', () => {
  const pi = makePaymentInfo()

  it('returns true when frozen', async () => {
    const client = createMockPublicClient({ isFrozen: true })
    expect(await isFrozen(client, MOCK_FREEZE, pi)).toBe(true)
  })

  it('returns false when not frozen', async () => {
    const client = createMockPublicClient({ isFrozen: false })
    expect(await isFrozen(client, MOCK_FREEZE, pi)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Write functions — table-driven
// ---------------------------------------------------------------------------

const paymentInfo = makePaymentInfo()

const writeCases = [
  {
    name: 'freezePayment',
    fn: freezePayment as (...args: any[]) => Promise<any>,
    functionName: 'freeze',
    extraArgs: [] as unknown[],
    expectedArgs: [paymentInfo],
  },
  {
    name: 'unfreezePayment',
    fn: unfreezePayment as (...args: any[]) => Promise<any>,
    functionName: 'unfreeze',
    extraArgs: [] as unknown[],
    expectedArgs: [paymentInfo],
  },
]

describe('freeze write functions', () => {
  it.each(writeCases)('$name throws without account', async ({
    fn,
    extraArgs,
  }) => {
    await expect(
      fn(
        createMockWalletWithoutAccount(),
        MOCK_FREEZE,
        paymentInfo,
        ...extraArgs,
      ),
    ).rejects.toThrow(ContractCallError)
  })

  it.each(writeCases)('$name forwards to writeContract', async ({
    fn,
    functionName,
    extraArgs,
    expectedArgs,
  }) => {
    const wallet = createMockWalletClient()
    await fn(wallet, MOCK_FREEZE, paymentInfo, ...extraArgs)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_FREEZE,
        functionName,
        args: expectedArgs,
      }),
    )
  })
})
