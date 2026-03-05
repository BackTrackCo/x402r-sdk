import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  type EvidenceEntry,
  getEvidence,
  getEvidenceBatch,
  getEvidenceCount,
  SubmitterRole,
  submitEvidence,
} from '../src/operations/evidence.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
  TEST_ADDRESSES,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// Enum guard — must match Solidity values
// ---------------------------------------------------------------------------

describe('SubmitterRole', () => {
  it('matches Solidity enum values', () => {
    expect(SubmitterRole.Payer).toBe(0)
    expect(SubmitterRole.Receiver).toBe(1)
    expect(SubmitterRole.Arbiter).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

describe('evidence read functions', () => {
  const pi = makePaymentInfo()

  const mockEntry: EvidenceEntry = {
    submitter: TEST_ADDRESSES.payer,
    role: SubmitterRole.Payer,
    timestamp: 1700000000,
    cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  }

  it('getEvidence returns typed entry', async () => {
    const client = createMockPublicClient({ getEvidence: mockEntry })
    const result = await getEvidence(client, MOCK_CONTRACT, pi, 0n, 0n)
    expect(result).toEqual(mockEntry)
  })

  it('getEvidenceCount returns bigint', async () => {
    const client = createMockPublicClient({ getEvidenceCount: 3n })
    const result = await getEvidenceCount(client, MOCK_CONTRACT, pi, 0n)
    expect(result).toBe(3n)
  })

  it('getEvidenceBatch returns entries and total', async () => {
    const client = createMockPublicClient({
      getEvidenceBatch: [[mockEntry], 1n],
    })
    const result = await getEvidenceBatch(
      client,
      MOCK_CONTRACT,
      pi,
      0n,
      0n,
      10n,
    )
    expect(result.entries).toEqual([mockEntry])
    expect(result.total).toBe(1n)
  })

  it('getEvidenceBatch handles empty result', async () => {
    const client = createMockPublicClient({ getEvidenceBatch: [[], 0n] })
    const result = await getEvidenceBatch(
      client,
      MOCK_CONTRACT,
      pi,
      0n,
      0n,
      10n,
    )
    expect(result.entries).toEqual([])
    expect(result.total).toBe(0n)
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
      fn(
        createMockWalletWithoutAccount(),
        MOCK_CONTRACT,
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
