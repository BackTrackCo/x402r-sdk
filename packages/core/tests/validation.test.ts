import { describe, expect, it } from 'vitest'
import type { PaymentInfo } from '../src/types/index.js'
import { validatePaymentInfo } from '../src/validation/index.js'

const futureTimestamp = Math.floor(Date.now() / 1000) + 3600

function makeValidPaymentInfo(
  overrides: Partial<PaymentInfo> = {},
): PaymentInfo {
  return {
    operator: '0x1234567890123456789012345678901234567890',
    payer: '0x2345678901234567890123456789012345678901',
    receiver: '0x3456789012345678901234567890123456789012',
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    maxAmount: 1000000n,
    preApprovalExpiry: futureTimestamp,
    authorizationExpiry: futureTimestamp,
    refundExpiry: futureTimestamp + 86400,
    minFeeBps: 0,
    maxFeeBps: 1000,
    feeReceiver: '0x1234567890123456789012345678901234567890',
    salt: 12345n,
    ...overrides,
  }
}

const ZERO = '0x0000000000000000000000000000000000000000' as const

describe('validatePaymentInfo', () => {
  it('returns empty array for valid PaymentInfo', () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo())
    expect(issues).toEqual([])
  })

  it('catches zero operator address', () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ operator: ZERO }))
    const opError = issues.find((i) => i.field === 'operator')
    expect(opError).toBeDefined()
    expect(opError?.severity).toBe('error')
  })

  it('catches zero receiver address', () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ receiver: ZERO }))
    expect(issues.find((i) => i.field === 'receiver')).toBeDefined()
  })

  it('catches zero token address', () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ token: ZERO }))
    expect(issues.find((i) => i.field === 'token')).toBeDefined()
  })

  it('catches zero feeReceiver address', () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({ operator: ZERO, feeReceiver: ZERO }),
    )
    expect(
      issues.find((i) => i.field === 'feeReceiver' && i.severity === 'error'),
    ).toBeDefined()
  })

  it('catches zero maxAmount', () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ maxAmount: 0n }))
    const amtError = issues.find((i) => i.field === 'maxAmount')
    expect(amtError).toBeDefined()
    expect(amtError?.severity).toBe('error')
  })

  it('catches minFeeBps > maxFeeBps', () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({ minFeeBps: 500, maxFeeBps: 100 }),
    )
    const feeError = issues.find((i) => i.field === 'minFeeBps')
    expect(feeError).toBeDefined()
    expect(feeError?.severity).toBe('error')
  })

  it('catches maxFeeBps > 10000', () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({ maxFeeBps: 15000 }),
    )
    const feeError = issues.find((i) => i.field === 'maxFeeBps')
    expect(feeError).toBeDefined()
    expect(feeError?.severity).toBe('error')
  })

  it('catches expired authorizationExpiry', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({ authorizationExpiry: pastTimestamp }),
    )
    expect(issues.find((i) => i.field === 'authorizationExpiry')).toBeDefined()
  })

  it('catches expired preApprovalExpiry', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({ preApprovalExpiry: pastTimestamp }),
    )
    const issue = issues.find((i) => i.field === 'preApprovalExpiry')
    expect(issue).toBeDefined()
    expect(issue?.message).toContain('ERC-3009')
  })

  it('skips preApprovalExpiry check when zero', () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({ preApprovalExpiry: 0 }),
    )
    expect(issues.find((i) => i.field === 'preApprovalExpiry')).toBeUndefined()
  })

  it('warns when feeReceiver != operator', () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({
        feeReceiver: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    )
    const warning = issues.find(
      (i) => i.field === 'feeReceiver' && i.severity === 'warning',
    )
    expect(warning).toBeDefined()
    expect(warning?.message).toContain('InvalidFeeReceiver')
  })

  it('allows payer to be zero address (payer-agnostic)', () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ payer: ZERO }))
    expect(issues.find((i) => i.field === 'payer')).toBeUndefined()
  })

  it('returns multiple errors for multiple issues', () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({
        operator: ZERO,
        receiver: ZERO,
        maxAmount: 0n,
      }),
    )
    expect(issues.length).toBeGreaterThanOrEqual(3)
  })
})
