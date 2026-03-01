import { describe, expect, it } from 'vitest'
import { ValidationError } from '../src/errors/index.js'
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
  it('does not throw for valid PaymentInfo', () => {
    expect(() => validatePaymentInfo(makeValidPaymentInfo())).not.toThrow()
  })

  it('throws for zero operator', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ operator: ZERO })),
    ).toThrow(ValidationError)
  })

  it('throws for zero receiver', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ receiver: ZERO })),
    ).toThrow(ValidationError)
  })

  it('throws for zero token', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ token: ZERO })),
    ).toThrow(ValidationError)
  })

  it('throws for zero feeReceiver', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ feeReceiver: ZERO })),
    ).toThrow(ValidationError)
  })

  it('throws for zero maxAmount', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ maxAmount: 0n })),
    ).toThrow(ValidationError)
  })

  it('throws when minFeeBps > maxFeeBps', () => {
    expect(() =>
      validatePaymentInfo(
        makeValidPaymentInfo({ minFeeBps: 500, maxFeeBps: 100 }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws when maxFeeBps > 10000', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ maxFeeBps: 15000 })),
    ).toThrow(ValidationError)
  })

  it('throws for expired authorizationExpiry', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
    expect(() =>
      validatePaymentInfo(
        makeValidPaymentInfo({ authorizationExpiry: pastTimestamp }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws for expired preApprovalExpiry', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
    expect(() =>
      validatePaymentInfo(
        makeValidPaymentInfo({ preApprovalExpiry: pastTimestamp }),
      ),
    ).toThrow(ValidationError)
  })

  it('does not throw when preApprovalExpiry is zero', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ preApprovalExpiry: 0 })),
    ).not.toThrow()
  })

  it('allows payer to be zero address (payer-agnostic)', () => {
    expect(() =>
      validatePaymentInfo(makeValidPaymentInfo({ payer: ZERO })),
    ).not.toThrow()
  })
})
