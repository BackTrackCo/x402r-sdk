import { describe, expect, it } from 'vitest'
import { getEvidence } from '../src/actions/evidence/getEvidence.js'
import { getEvidenceBatch } from '../src/actions/evidence/getEvidenceBatch.js'
import { getEvidenceCount } from '../src/actions/evidence/getEvidenceCount.js'
import { submitEvidence } from '../src/actions/evidence/submitEvidence.js'
import type { EvidenceEntry } from '../src/actions/evidence/types.js'
import { SubmitterRole } from '../src/actions/evidence/types.js'
import { ContractCallError } from '../src/errors/index.js'
import {
  createMockPublicClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
  TEST_ADDRESSES,
} from './fixtures.js'

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

describe('SubmitterRole', () => {
  it('matches Solidity enum values', () => {
    expect(SubmitterRole.Payer).toBe(0)
    expect(SubmitterRole.Receiver).toBe(1)
    expect(SubmitterRole.Arbiter).toBe(2)
  })
})

describe('evidence read functions', () => {
  const pi = makePaymentInfo()

  const mockEntry: EvidenceEntry = {
    submitter: TEST_ADDRESSES.payer,
    role: SubmitterRole.Payer,
    timestamp: 1700000000,
    cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  }

  it('getEvidence returns mapped entry with role cast', async () => {
    const client = createMockPublicClient({ getEvidence: mockEntry })
    const result = await getEvidence(client, {
      contractAddress: MOCK_CONTRACT,
      paymentInfo: pi,
      nonce: 0n,
      index: 0n,
    })
    expect(result).toEqual(mockEntry)
    expect(result.role).toBe(SubmitterRole.Payer)
  })

  it('getEvidenceCount returns the count', async () => {
    const client = createMockPublicClient({ getEvidenceCount: 3n })
    const result = await getEvidenceCount(client, {
      contractAddress: MOCK_CONTRACT,
      paymentInfo: pi,
      nonce: 0n,
    })
    expect(result).toBe(3n)
  })

  it('getEvidenceBatch returns entries and total', async () => {
    const client = createMockPublicClient({
      getEvidenceBatch: [[mockEntry], 1n],
    })
    const result = await getEvidenceBatch(client, {
      contractAddress: MOCK_CONTRACT,
      paymentInfo: pi,
      nonce: 0n,
      offset: 0n,
      count: 10n,
    })
    expect(result.entries).toEqual([mockEntry])
    expect(result.total).toBe(1n)
  })
})

describe('evidence write functions', () => {
  it('submitEvidence throws without account', async () => {
    await expect(
      submitEvidence(createMockWalletWithoutAccount(), {
        contractAddress: MOCK_CONTRACT,
        refundRequestAddress: MOCK_CONTRACT,
        paymentInfo: makePaymentInfo(),
        nonce: 1n,
        cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      }),
    ).rejects.toThrow(ContractCallError)
  })
})
