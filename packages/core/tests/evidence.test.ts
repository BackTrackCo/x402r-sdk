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
// submitEvidence
// ---------------------------------------------------------------------------

describe('submitEvidence', () => {
  it('throws ContractCallError without account', async () => {
    const paymentInfo = makePaymentInfo()
    await expect(
      submitEvidence(
        mockWalletWithoutAccount(),
        MOCK_CONTRACT,
        paymentInfo,
        0n,
        'QmTest',
      ),
    ).rejects.toThrow(ContractCallError)
  })

  it('passes (paymentInfo, nonce, cid) correctly', async () => {
    const paymentInfo = makePaymentInfo()
    const wallet = mockWalletWithAccount()
    const cid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'

    await submitEvidence(wallet, MOCK_CONTRACT, paymentInfo, 1n, cid)

    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_CONTRACT,
        functionName: 'submitEvidence',
        args: [paymentInfo, 1n, cid],
      }),
    )
  })
})
