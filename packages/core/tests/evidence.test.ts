import type { WalletClient } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { SubmitterRole, submitEvidence } from '../src/operations/evidence.js'
import { makePaymentInfo } from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const
const MOCK_CALLER = '0x7777777777777777777777777777777777777777' as const
const MOCK_HASH =
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const

const mockWalletWithAccount = () =>
  ({
    writeContract: vi.fn().mockResolvedValue(MOCK_HASH),
    chain: { id: 84532 },
    account: { address: MOCK_CALLER },
  }) as unknown as WalletClient

const mockWalletWithoutAccount = () =>
  ({
    writeContract: vi.fn(),
    chain: { id: 84532 },
    account: undefined,
  }) as unknown as WalletClient

// ---------------------------------------------------------------------------
// SubmitterRole
// ---------------------------------------------------------------------------

describe('SubmitterRole', () => {
  it('matches Solidity enum values', () => {
    expect(SubmitterRole.Payer).toBe(0)
    expect(SubmitterRole.Receiver).toBe(1)
    expect(SubmitterRole.Arbiter).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Write functions — table-driven
// ---------------------------------------------------------------------------

const paymentInfo = makePaymentInfo()
const MOCK_CID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'

const writeCases = [
  {
    name: 'submitEvidence',
    fn: submitEvidence as (...args: any[]) => Promise<any>,
    functionName: 'submitEvidence',
    extraArgs: [1n, MOCK_CID],
    expectedArgs: [paymentInfo, 1n, MOCK_CID],
  },
]

describe('evidence write functions', () => {
  it.each(writeCases)('$name throws without account', async ({
    fn,
    extraArgs,
  }) => {
    await expect(
      fn(mockWalletWithoutAccount(), MOCK_CONTRACT, paymentInfo, ...extraArgs),
    ).rejects.toThrow(ContractCallError)
  })

  it.each(writeCases)('$name forwards to writeContract', async ({
    fn,
    functionName,
    extraArgs,
    expectedArgs,
  }) => {
    const wallet = mockWalletWithAccount()
    await fn(wallet, MOCK_CONTRACT, paymentInfo, ...extraArgs)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_CONTRACT,
        functionName,
        args: expectedArgs,
      }),
    )
  })
})
