import { describe, expect, it, vi } from 'vitest'
import { createEvidenceActions } from '../../src/actions/evidence.js'
import {
  createTestConfig,
  mockPaymentInfo,
  TEST_EVIDENCE,
} from '../fixtures.js'

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@x402r/core')>()
  return {
    ...actual,
    submitEvidence: vi.fn().mockResolvedValue('0xmockhash'),
    getEvidence: vi.fn().mockResolvedValue({
      submitter: '0x0000000000000000000000000000000000000001',
      role: 0,
      timestamp: 1700000000,
      cid: 'QmTest',
    }),
    getEvidenceBatch: vi.fn().mockResolvedValue({ entries: [], total: 0n }),
    getEvidenceCount: vi.fn().mockResolvedValue(5n),
  }
})

describe('createEvidenceActions', () => {
  it('submit delegates to core with refundRequestEvidenceAddress and requires wallet', async () => {
    const { submitEvidence } = await import('@x402r/core')
    const config = createTestConfig()
    const actions = createEvidenceActions(config, TEST_EVIDENCE)

    await actions.submit(mockPaymentInfo, 'QmTest')

    expect(submitEvidence).toHaveBeenCalledWith(config.walletClient, {
      contractAddress: TEST_EVIDENCE,
      paymentInfo: mockPaymentInfo,
      cid: 'QmTest',
    })
  })

  it('submit throws without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createEvidenceActions(config, TEST_EVIDENCE)

    await expect(() =>
      actions.submit(mockPaymentInfo, 'QmTest'),
    ).rejects.toThrow('walletClient is required')
  })

  it('get delegates to core with contractAddress and index', async () => {
    const { getEvidence } = await import('@x402r/core')
    const config = createTestConfig()
    const actions = createEvidenceActions(config, TEST_EVIDENCE)

    const result = await actions.get(mockPaymentInfo, 0n)

    expect(result).toEqual({
      submitter: '0x0000000000000000000000000000000000000001',
      role: 0,
      timestamp: 1700000000,
      cid: 'QmTest',
    })
    expect(getEvidence).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_EVIDENCE,
      paymentInfo: mockPaymentInfo,
      index: 0n,
    })
  })

  it('getBatch delegates to core with offset and count', async () => {
    const { getEvidenceBatch } = await import('@x402r/core')
    const config = createTestConfig()
    const actions = createEvidenceActions(config, TEST_EVIDENCE)

    const result = await actions.getBatch(mockPaymentInfo, 0n, 10n)

    expect(result).toEqual({ entries: [], total: 0n })
    expect(getEvidenceBatch).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_EVIDENCE,
      paymentInfo: mockPaymentInfo,
      offset: 0n,
      count: 10n,
    })
  })

  it('count works without walletClient (read-only)', async () => {
    const { getEvidenceCount } = await import('@x402r/core')
    const config = createTestConfig({ walletClient: undefined })
    const actions = createEvidenceActions(config, TEST_EVIDENCE)

    const result = await actions.count(mockPaymentInfo)

    expect(result).toBe(5n)
    expect(getEvidenceCount).toHaveBeenCalledWith(config.publicClient, {
      contractAddress: TEST_EVIDENCE,
      paymentInfo: mockPaymentInfo,
    })
  })
})
